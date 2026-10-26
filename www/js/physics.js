// ===========================================================================
// PHYSICS — builds a physical spec from a car + parts + tune, and simulates
// a drag run: engine, boost, clutch / torque converter, gearbox, tire slip,
// tire temperature & pressure, suspension weight transfer and wheelies.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var G = DR.G, RPM2W = Math.PI / 30, W2RPM = 30 / Math.PI;

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  DR.clamp = clamp;

  // ---------------------------------------------------------------- torque curve
  // Normalised NA torque: a rounded rise to the torque peak, easing off so
  // power peaks at pkRpm; past the power peak POWER (not torque) falls away
  // gently, like a real engine running out of breath towards the limiter.
  function shape(S, rpm) {
    var x = rpm / S.tqRpm, s;
    if (x < 1) s = 1 - S.lowK * (1 - x) * (1 - x);
    else if (rpm <= S.pkRpm) s = 1 - S.highK * (x - 1) * (x - 1);
    else {
      var xp = S.pkRpm / S.tqRpm, sp = 1 - S.highK * (xp - 1) * (xp - 1), d = (rpm - S.pkRpm) / S.pkRpm;
      s = sp * S.pkRpm * (1 - 1.8 * d * d) / rpm;
    }
    return Math.max(0.05, s);
  }

  // ---- charge air. Compressing air heats it: the outlet temperature is
  // T1 (1 + (PR^0.288 - 1) / eta), eta the compressor's efficiency (a
  // cheap or small unit pushed near its limit is less efficient and runs
  // hotter). The intercooler takes back its share of the heat down to
  // ambient (an ice tank cools below it), and E85 or methanol cool the
  // charge as they evaporate. Hot air is thin (less power per psi) and
  // knocks sooner: the fuel's knock limit is for a 50 C charge and drops
  // 0.12 psi per degree over it.
  DR.AMBIENT_C = 25;
  function chargeTemp(S, boost) {
    if (S.fiType === 'none' || !(boost > 0)) return DR.AMBIENT_C;
    var pr = (14.7 + boost) / 14.7, frac = S.fiMax ? boost / S.fiMax : 0;
    var eta = Math.max(0.35, S.etaC - Math.max(0, frac - 0.75) * 0.3);
    var t1 = DR.AMBIENT_C + 273.15, t2 = t1 * (1 + (Math.pow(pr, 0.288) - 1) / eta);
    var sink = (S.icSink != null ? S.icSink : DR.AMBIENT_C) + 273.15;
    return t2 - S.icE * (t2 - sink) - 273.15 - S.cool * Math.min(1, boost / 10);
  }
  function knockAt(S, iat) { return Math.min(S.knockFuel + 2, S.knockFuel - 0.12 * (iat - 50)); }
  // A factory boosted engine is built for its boost (lower compression,
  // timing to match): it gets the knock margin it needs to run factory boost
  // on pump gas with its own intercooler, plus 2 psi.
  var knockAddCache = {};
  function engineKnockAdd(engId) {
    if (knockAddCache[engId] != null) return knockAddCache[engId];
    var e = DR.ENGINES[engId], add = 0;
    if (e.fi && !e.diesel) {
      var S = engineCore(e, { knock: 17, noAdd: true }, 1);
      add = Math.max(0, e.fi.boost + 2 - knockAt(S, chargeTemp(S, e.fi.boost)));
    }
    return (knockAddCache[engId] = add);
  }
  DR.chargeTemp = chargeTemp;
  // Full-throttle torque (Nm) at rpm with a given boost (psi). No nitrous.
  function boostedTorque(S, rpm, boost) {
    var w = Math.max(rpm, 300) * RPM2W;
    var Tna = S.Tpk * shape(S, rpm);
    // past the mechanical limit the valves float: power falls away fast
    if (S.mech && rpm > S.mech) Tna *= Math.max(0.3, 1 - (rpm - S.mech) / 1200);
    var iat = boost > 0 ? chargeTemp(S, boost) : DR.AMBIENT_C, kn = boost > 0 ? knockAt(S, iat) : 99;
    var be = Math.min(boost, kn) + Math.max(0, boost - kn) * 0.35;
    // past what the ignition can light, cylinders misfire
    if (S.sparkPsi != null && boost > S.sparkPsi) be -= (boost - S.sparkPsi) * 0.7;
    var T = Tna * (1 + be / 14.7) * (DR.AMBIENT_C + 273.15) / (iat + 273.15);
    if (S.fiType === 'roots' || S.fiType === 'screw' || S.fiType === 'cent')
      T -= S.paras * S.Tpk * (boost / 14.7) * Math.min(1, rpm / S.ref) * 1.2;
    // past what the compressor can flow it chokes and heats the charge:
    // power falls away instead of holding flat (small turbos run out up top)
    if (S.flowW && T * w > S.flowW) T = Math.max(Tna, S.flowW * (1 - 0.12 * Math.min(1, (T * w - S.flowW) / S.flowW)) / w);
    T = Math.min(T, S.fuelW / w);
    return T;
  }

  // Boost (psi) a fully spooled system makes at this rpm with full throttle.
  function steadyBoost(S, rpm) {
    if (S.fiType === 'none') return 0;
    if (S.fiType === 'turbo') return S.boostSet * clamp((rpm - S.spoolLo) / (S.spoolHi - S.spoolLo), 0, 1);
    if (S.fiType === 'cent') return S.boostSet * Math.pow(Math.min(rpm, S.ref) / S.ref, 2);
    return S.boostSet * clamp(rpm / 1800, 0, 1);
  }
  DR.steadyBoost = steadyBoost;

  // Peak of the NA torque curve's power for Tpk = 1 (calibration helper).
  function shapePeak(S) {
    var best = 0, top = Math.max(S.red, S.pkRpm + 800);
    for (var rpm = 1000; rpm <= top; rpm += 50) { var p = shape(S, rpm) * rpm * RPM2W; if (p > best) best = p; }
    return best;
  }
  // Cache of NA peak torque per engine so stock engines hit their rated hp.
  var tpkCache = {};
  function stockTpk(engId) {
    if (tpkCache[engId]) return tpkCache[engId];
    var e = DR.ENGINES[engId];
    var S = engineCore(e, {}, 1);
    S.flowW = 0; S.fuelW = 1e12;
    var best = 0;
    for (var rpm = 1000; rpm <= S.red; rpm += 50) {
      var p = boostedTorque(S, rpm, steadyBoost(S, rpm)) * rpm * RPM2W;
      if (p > best) best = p;
    }
    tpkCache[engId] = e.hp * DR.HP / best;
    return tpkCache[engId];
  }

  // Engine fundamentals shared by the spec builder and the stock calibration.
  function engineCore(e, mods, Tpk) {
    var S = {};
    // breathing upgrades move the torque and power peaks (buildSpec)
    S.tqRpm = mods.tq || e.tq;
    S.pkRpm = mods.pk || e.pk;
    S.ref = Math.max(e.red, S.pkRpm + 300);  // where the engine "breathes" to (sets blower curves)
    S.red = e.red;                         // rev limiter; buildSpec sets the real one
    S.idle = e.diesel ? 700 : 900;
    S.lowK = 0.45 + (mods.low || 0);
    var xp = Math.max(1.05, S.pkRpm / S.tqRpm);
    S.highK = 1 / ((xp - 1) * (xp - 1) + 2 * xp * (xp - 1));
    S.Tpk = Tpk;
    var fiId = mods.fi || (e.fi ? e.fi.part : 'none');
    var fi = DR.FI[fiId];
    S.fiId = fiId;
    S.fiType = fi.type;
    S.boostSet = mods.boost != null ? mods.boost : (e.fi ? e.fi.boost : 0);
    S.maxBoost = fi.maxBoost || 0;
    if (fi.type === 'turbo') {
      // exhaust flow sets the spool: a rotary fires every rotor face once
      // per shaft turn, so a 1.3L 13B flows like a 2.6L piston engine
      var ds = clamp(Math.sqrt(3.0 / airDisp(e)), 0.55, 1.6);
      S.spool15 = fi.spool * ds;
      S.lag = fi.lag;
      setSpool(S);
    }
    S.paras = fi.paras || 0;
    S.flowW = fi.flow ? fi.flow * DR.HP : 0;
    // compressor efficiency, intercooler effectiveness (factory boosted
    // engines have their own intercooler; a bolt-on kit has none) and fuel
    // charge cooling
    // (a factory turbo or blower is matched to its engine: it has headroom
    // past factory boost before it falls off its sweet spot)
    S.fiMax = fi.price ? fi.maxBoost || 0 : (fi.maxBoost || 0) * 1.25;
    S.etaC = fi.eta || { turbo: 0.7, roots: 0.55, screw: 0.66, cent: 0.7 }[fi.type] || 0.7;
    S.icE = mods.ic != null && mods.ic > 0 ? mods.ic : fiId.indexOf('fi_oem') === 0 ? 0.65 : 0;
    S.icSink = mods.icSink;
    S.cool = mods.cool || 0;
    S.knockFuel = S.knock = e.diesel ? 99 : (mods.knock || 17) + (mods.noAdd ? 0 : engineKnockAdd(e.id));
    S.fuelW = 1e12;
    return S;
  }

  function airDisp(e) { return e.rotary ? e.disp * 2 : e.disp; }
  DR.airDisp = airDisp;
  // full-boost rpm for the boost asked for: more boost needs more exhaust
  // energy, so the turbo gets there later (about 14% later per 10 psi over
  // 15, in line with dyno boost curves). A turbo too big for the engine may
  // not reach it before the limiter.
  function spoolAt(S, boost) { return S.spool15 * clamp(1 + 0.14 * (boost - 15) / 10, 0.8, 1.8); }
  function setSpool(S, sized) {
    if (!S.spool15) return;
    S.spoolHi = spoolAt(S, S.boostSet);
    // a bolt-on turbo far too big for the engine: if the power the engine
    // asks for is under ~40% of what the turbo is built to flow, it sits
    // way left on its compressor map and needs a lot more revs to light
    if (sized && S.flowW && DR.FI[S.fiId].price) {
      var want = shapePeak(S) * S.Tpk * (1 + S.boostSet / 14.7) * (DR.AMBIENT_C + 273.15) / (chargeTemp(S, S.boostSet) + 273.15), frac = want / S.flowW;
      if (frac < 0.4) S.spoolHi *= Math.min(1.6, Math.sqrt(0.4 / Math.max(0.05, frac)));
    }
    S.spoolLo = S.spoolHi * 0.55;
  }

  // ---------------------------------------------------------------- spec builder
  DR.buildSpec = function (inst, tuneOverride) {
    var car = DR.CARS[inst.carId];
    var engId = inst.engine || car.engine, e = DR.ENGINES[engId];
    // a part that does not apply to this car (no cams on a rotary, no
    // ignition on a diesel...) counts as the stock one
    var o = function (cat) { return DR.partApplies(cat, inst) ? DR.getOption(cat, inst) : DR.getOption(cat, inst, 'stock'); };
    var rotary = !!DR.ENGINES[inst.engine || car.engine].rotary;
    var air = o('airfilter'), intake = o('intake'), tb = o('throttle'), exh = o('exhaust'), hdr = o('headers');
    var cams = o('cams'), heads = o('heads'), vtrain = o('valvetrain');
    var pist = o('pistons'), rods = o('rods'), crank = o('crank'), block = o('block'), oil = o('oiling');
    var inj = o('injectors'), pump = o('fuelpump'), fuel = o('fueltype'), ign = o('ignition'), ecu = o('ecu');
    var ic = o('ic'), gate = o('wastegate'), bov = o('bov'), launch = o('launch'), nos = o('nitrous'), nosc = o('nosctrl'), nheat = o('nosheat');
    var axle = o('rearend'), chas = o('chassis'), fsus = o('frontsusp'), brakes = o('brakes'), batt = o('battery');
    var trId = DR.partId('trans', inst), tr = DR.TRANS[trId];
    var clutch = o('clutch'), conv = o('converter'), fly = o('flywheel'), shaft = o('driveshaft'), diff = o('diff');
    var layout = o('layout'), springs = o('springs'), shocks = o('shocks'), rs = o('rearsusp'), bar = o('wheeliebar');
    var aero = o('aero'), wheels = o('wheels'), ftires = o('ftires'), wt = o('weight');
    var tireId = DR.partId('rtires', inst), tire = DR.TIRES[tireId], stockTire = DR.TIRES[car.tire];
    var fiId = DR.partId('fi', inst);
    var stockEng = DR.ENGINES[car.engine];

    // ---- breathing: B (0..1) of the engine's race headroom is unlocked.
    // Power goes from stock towards bg x stock and the power peak from pk
    // towards bp; the torque peak follows. The curve's peak torque is then
    // solved so the NA-equivalent peak power lands on that target.
    // ---- the tune: a flash (or standalone) recalibrates the ECU for the
    // parts. Rival builds (inst.ai) are always set up properly. Parts that
    // need it (part.tune): 'hard' won't run right without one, 'soft' runs
    // but leaves power on the table.
    var ai = !!inst.ai, tuned = ai || !!ecu.tune, untuned = [];
    var camK = 1;
    if (!tuned && cams.tune) { camK = cams.tune === 'soft' ? 0.5 : 0; untuned.push(cams.tune === 'soft' ? ['cams', 'Stage 1 cams on the stock tune: about half the gain, rough idle'] : ['cams', 'The stock tune can\'t run these cams: it surges and loses power']); }
    var B = clamp([air, intake, tb, exh, hdr, heads, ecu].reduce(function (a, p) { return a + (p.bw || 0); }, 0) + (cams.bw || 0) * camK, 0, 1);
    var bg = e.bg || 1.3, bp = e.bp || e.pk + 1000;
    var pkB = e.pk + (bp - e.pk) * B;
    var tqB = Math.min(e.tq + (Math.max(e.tq, bp * 0.76) - e.tq) * B, pkB - 400);
    // compression: high-comp pistons make more power but knock sooner
    var crMul = pist.cr > 0 ? 1.04 : pist.cr < 0 ? 0.98 : 1, crKnock = -3 * (pist.cr || 0);
    var mods = { pk: pkB, tq: tqB, low: (intake.low || 0) + (cams.low || 0), fi: fiId, ic: ic.ic || 0, icSink: ic.sink, cool: fuel.cool || 0, knock: fuel.knock + (e.diesel ? 0 : crKnock) };
    var S = engineCore(e, mods, 1);
    var naStock = stockTpk(engId) * shapePeak(engineCore(e, {}, 1));
    var untunedK = 1;
    if (!tuned && cams.tune === 'hard') untunedK *= 0.94;
    if (!tuned && inj.tune) { untunedK *= 0.88; untuned.push(['injectors', 'Bigger injectors on the stock tune: it runs pig-rich']); }
    S.Tpk = naStock * (1 + (bg - 1) * B) * (e.diesel ? 1 : fuel.fmul * crMul) * (1 + (oil.pw || 0)) * untunedK / shapePeak(S);
    S.breathing = B;
    S.carId = inst.carId; S.car = car; S.engId = engId; S.eng = e;
    S.name = car.name;
    S.diesel = !!e.diesel;
    // ---- rev limits: the hardware sets how high the engine can safely
    // spin (valvetrain & bottom end), the ECU sets where the limiter is
    S.factoryRed = e.red;
    // a rotary has no valves to float: its ports never run out of time
    S.vtLimit = rotary ? e.red + 3000 : e.red + 400 + (vtrain.vt || 0) - (cams.stress || 0);
    var beBy = [['pistons', pist.be], ['rods', rods.be], ['crank', crank.be], ['oiling', oil.be]].filter(function (p) { return !rotary || p[0] !== 'rods'; }).sort(function (a, b) { return a[1] - b[1]; });
    S.beLimit = e.red + beBy[0][1];
    S.beWeak = beBy[0][0];
    S.rotary = rotary;
    S.partRpm = { pistons: e.red + pist.be, rods: e.red + rods.be, crank: e.red + crank.be, oiling: e.red + oil.be };
    S.mech = Math.min(S.vtLimit, S.beLimit);
    var safeRed = Math.max(e.red, S.mech - 200);
    if (ecu.ecu >= 2) {
      var tsrc = tuneOverride || inst.tune || {};
      S.red = tsrc.revLimit != null ? clamp(tsrc.revLimit, revMin(S), revMax(S)) : safeRed;
    } else if (ecu.ecu === 1) S.red = Math.min(safeRed, e.red + 800);
    else S.red = e.red;
    S.red = Math.round(S.red / 50) * 50;
    S.limit = S.red;
    // the bottom end is as strong as its weakest part
    var holdBy = [['pistons', pist.hold], ['rods', rods.hold], ['crank', crank.hold], ['block', block.hold]].filter(function (p) { return !rotary || p[0] !== 'rods'; }).sort(function (a, b) { return a[1] - b[1]; });
    S.safeHp = e.safe * holdBy[0][1];
    S.safeWeak = holdBy[0][0];
    S.partHold = { pistons: e.safe * pist.hold, rods: e.safe * rods.hold, crank: e.safe * crank.hold, block: e.safe * block.hold };
    // factory fuel systems: the injectors feed the engine they came on with
    // ~25% to spare (~15% on a factory boosted one); the pump is the car's
    // and has a little more (a Fox's 88 lph pump is good for ~250 hp NA)
    var stockInj = ai ? Math.max(e.hp * 1.35 + 60, 300) : e.hp * (e.fi ? 1.15 : 1.25);
    var stockPump = ai ? stockInj : Math.max(stockEng.hp * 1.3, 180);
    S.fuelInj = inj.fuel || stockInj; S.fuelPump = pump.fuel || stockPump;
    S.stockFuel = !inj.fuel && !pump.fuel;
    S.fuelW = Math.min(S.fuelInj, S.fuelPump) * (e.diesel ? 1 : fuel.ff) * DR.HP;
    // ignition: the factory coils light factory boost plus a few psi (about
    // 10 psi on an engine that never had a turbo)
    S.sparkPsi = e.diesel ? 99 : (e.fi ? e.fi.boost + 6 : 10) + (ign.spark || 0);
    S.sparkNos = e.diesel ? 9999 : 150 + (ign.spark || 0) * 15;
    // a bolt-on turbo's wastegate sets how much of its boost you can use
    var fiU = DR.FI[fiId];
    if (fiU.type === 'turbo') {
      if (fiU.price) S.maxBoost = Math.round(S.maxBoost * gate.gate * 2) / 2;   // factory turbos come with a gate sized for them
      S.lag *= gate.spoolK;
    }
    if (!tuned && fiU.type !== 'none' && fiU.price) { S.maxBoost = Math.min(S.maxBoost, 5); untuned.push(['fi', 'The stock tune can\'t fuel or time more than ~5 psi']); }
    else if (!tuned && fiU.type !== 'none' && e.fi) S.maxBoost = Math.min(S.maxBoost, e.fi.boost + 2);
    if (!tuned && fuel.tune) untuned.push(['fueltype', fuel.name + ' on a gasoline tune runs lean']);
    S.untuned = untuned; S.tuned = tuned; S.e85Lean = !tuned && !!fuel.tune;
    S.bovT = fiU.type === 'turbo' ? (fiU.price ? bov.bov : Math.max(0.3, bov.bov)) : 0.15;
    S.ecu = ecu.ecu;
    S.twostep = launch.twostep;
    S.nosHp = Math.round(nos.nos * (nos.nos ? nheat.nosk : 1));
    S.nosRated = nos.nos;
    S.fuelId = DR.partId('fueltype', inst);
    S.nosCut = S.nosHp > S.sparkNos;
    if (S.nosCut) S.nosHp = Math.round(S.sparkNos + (S.nosHp - S.sparkNos) * 0.4);   // spark blows out
    S.nosW = S.nosHp * DR.HP;
    // the fuel that feeds the spray: injectors and pump (dry), pump (wet) or
    // its own system; what's there for it is worked out with the risk
    S.nosFuel = nos.nosFuel || 'own';
    S.fuelFF = e.diesel ? 1 : fuel.ff;
    S.prog = nosc.prog && nos.nos > 0;
    S.Ie = (0.06 + 0.022 * e.disp + (e.diesel ? 0.25 : 0)) * fly.fly * (crank.ie || 1);

    // ---- drivetrain
    S.transId = trId; S.trType = tr.type; S.shiftTime = tr.shift * (DR.partApplies('shifter', inst) ? DR.getOption('shifter', inst).shiftK || 1 : 1); S.trMaxTq = tr.maxTq;
    S.tbrake = tr.type === 'auto' && !!DR.getOption('transbrake', inst).tbrake;
    S.drive = layout.layout || car.drive;
    S.eff = tr.eff * (S.drive === 'AWD' ? 0.95 : S.drive === 'FWD' ? 1.03 : 1);   // FWD: no right-angle drive in the diff
    if (tr.type === 'auto') {
      S.stall = conv.stall; S.TR = conv.tr;
    } else {
      var stockTqNm = stockEng.hp * DR.HP / (stockEng.pk * RPM2W) * 1.3;
      S.clCap = clutch.cap || Math.max(420, stockTqNm * 1.4);
      S.engage = clutch.engage;
      S.slider = clutch.slide || null;   // [clamp share at the hit, seconds to full lock]
    }
    S.dgrip = diff.dgrip;
    // axles: the factory ones hold a margin over the factory engine
    var stockTq = stockEng.hp * DR.HP / (stockEng.pk * RPM2W) * 1.25;
    S.axleTq = axle.axle || Math.max(500, stockTq * 1.8);

    // ---- tires & rotating mass
    S.tireId = tireId; S.tire = tire;
    S.r = tire.r;
    S.tslip = tire.slip; S.tfall = tire.fall; S.tfk = tire.fk || 1;
    S.bead = !!wheels.bead;
    var wheelMass = 22 + wheels.wm + brakes.bkg * 0.5;
    var Iaxle = tire.m * tire.r * tire.r * 0.75 + wheelMass * Math.pow(tire.r * 0.55, 2) + 0.9 * shaft.shaft;
    S.Iw = Iaxle * (S.drive === 'AWD' ? 1.8 : 1);

    // ---- mass & geometry
    var share = car.ep === 'front' ? 0.9 : car.ep === 'mid' ? 0.15 : -0.2;
    var chassis = (car.m - stockEng.w) * (1 - wt.wr);
    var chassisFront = (car.m * car.f - stockEng.w * share) * (1 - wt.wr);
    var fiW = (fiId !== 'none' && DR.FI[fiId].price) ? DR.FI[fiId].w : 0;
    var extraRear = (tire.m - stockTire.m) + wheels.wm + (bar.bar ? 12 : 0) + (aero.cla ? 8 : 0) + (nos.nos ? 18 : 0) + (axle.am || 0) + brakes.bkg * 0.5 + batt.bat + Math.min(0, batt.batkg);
    var extraFront = ftires.fm + (S.drive === 'AWD' && car.drive !== 'AWD' ? 60 : 0) + fiW * share + fsus.fkg + brakes.bkg * 0.5 - batt.bat + Math.max(0, batt.batkg);
    var extraMid = (S.drive === 'AWD' && car.drive !== 'AWD' ? 30 : 0) + chas.kg;
    S.m = chassis + e.w + fiW + extraRear + extraFront + extraMid;
    var front = chassisFront + e.w * share + extraFront + extraMid * 0.5;
    S.f = clamp(front / S.m, 0.2, 0.72);
    S.L = car.wb;
    S.b = S.L * S.f;                      // CG to rear axle
    S.h = car.h - (wt.low || 0) + (tire.r - stockTire.r) * 0.5;   // ride height is added below
    S.cda = car.cda + aero.dcda;
    S.cla = aero.cla;
    S.Ip = S.m * S.L * S.L * 0.19;
    // wheel torque the foot brake can hold on the line: the locked fronts'
    // grip plus the rear brakes, which oppose the drive torque at the hub
    S.brakeHold = 1.6 * S.m * G * S.r;

    // ---- tune
    var T = DR.fullTune(inst, S, tuneOverride);
    S.tune = T;
    S.boostSet = S.fiType === 'none' ? 0 : T.boost;
    setSpool(S, true);
    // the charge at full boost, and the knock limit that leaves the fuel
    S.iat = chargeTemp(S, S.boostSet);
    if (S.fiType !== 'none') S.knock = Math.floor(knockAt(S, S.iat) * 2) / 2;
    S.ratios = tr.adj ? T.gears.slice() : DR.boxRatios(trId, car);
    S.fd = T.fd;

    // tire pressure
    var d = (T.psi - tire.optP) / tire.optP;
    var pf = d <= 0 ? 1 + 0.25 * (-d) - (S.bead ? 0.55 : 1.4) * d * d : 1 - 0.5 * d - 0.6 * d * d;
    if (T.psi < 9 && !S.bead) pf *= 0.82;          // tire spins on the rim
    S.pf = clamp(pf, 0.4, 1.1);
    S.crr = 0.012 * (1 + Math.max(0, -d) * 0.6) * ftires.roll;

    // ---- suspension: front and rear corners with their own spring, bump /
    // rebound damping, bump stops and droop limits under a body that heaves
    // and pitches (see Sim.step). Ride height moves the CG, the drag and the
    // travel left before the bump stops.
    S.as = (rs.adjA ? T.antiSquat : rs.as) * chas.stiff;
    var rideF = springs.adjS ? T.rideF / 1000 : -(springs.low || 0), rideR = springs.adjS ? T.rideR / 1000 : -(springs.low || 0);
    S.rideF = rideF; S.rideR = rideR;
    S.h += 0.9 * (rideF + rideR) / 2;
    S.cda *= 1 + 1.1 * (rideF + rideR) / 2 + 0.6 * Math.max(0, rideR - rideF);   // low = less air under the car; rake costs a little
    function rateMul(click) { return springs.adjS ? springs.rate[0] + (springs.rate[1] - springs.rate[0]) * (click - 1) / 9 : springs.sk; }
    var mF = S.m * S.f, mR = S.m * (1 - S.f), wF = 2 * Math.PI * 1.45, wR = 2 * Math.PI * 1.65;
    S.kf = mF * wF * wF * rateMul(T.springF);
    S.kr = mR * wR * wR * rateMul(T.springR);
    // damping: clicks 1..10 scale the shock's ratio 0.35x..1.9x; rebound is
    // naturally firmer than bump
    function zc(click, adj, base) { return adj ? shocks.z * base * (0.35 + 0.17 * (click - 1)) / 1.03 : shocks.z * base; }
    var a2 = shocks.adjD === 2, a1 = shocks.adjD >= 1;
    S.cbF = 2 * zc(T.bumpF, a2, 0.75) * Math.sqrt(S.kf * mF);
    S.crF = 2 * zc(T.rebF, a1, 1.3) * Math.sqrt(S.kf * mF);
    S.cbR = 2 * zc(T.bumpR, a1, 0.75) * Math.sqrt(S.kr * mR);
    S.crR = 2 * zc(T.rebR, a2, 1.3) * Math.sqrt(S.kr * mR);
    // travel: raising the car adds bump travel and takes away droop
    S.bumpF = Math.max(0.012, 0.075 + rideF); S.bumpR = Math.max(0.012, 0.085 + rideR);
    S.droopF = Math.max(0.01, 0.11 - rideF * 0.6); S.droopR = Math.max(0.01, 0.09 - rideR * 0.6);
    if (shocks.lim && T.limitF > 0) S.droopF = Math.min(S.droopF, T.limitF / 1000);
    S.bar = !!bar.bar;
    S.barRad = T.barDeg * Math.PI / 180;
    S.barLen = 1.6;

    // ---- summary numbers
    var dyno = DR.dyno(S);
    // what the engine would make with all the fuel it wants (for lean risk)
    var fw = S.fuelW; S.fuelW = 1e12; S.fuelDemand = DR.dyno(S).peakHp; S.fuelW = fw;
    S.peakHp = dyno.peakHp; S.peakTq = dyno.peakTq; S.peakHpRpm = dyno.peakHpRpm;
    S.totalHp = S.peakHp + S.nosHp;
    // Launch clutch slip: a car that can't overpower its tires in 1st has its
    // clutch slipped off the line (or it just bogs); one with torque to spare
    // gets the clutch dumped raw. 1 = fully slipped .. 0 = raw.
    var axleN = S.m * G * (S.drive === 'FWD' ? S.f : S.drive === 'AWD' ? 1 : 1 - S.f);
    // (judged on the power the car makes once the turbo is lit, 2-step or
    // not: a big turbo car is a high-power car even if it leaves off boost)
    var lb = S.fiType === 'turbo' ? S.boostSet : S.fiType !== 'none' ? null : 0, tq0 = 0;
    for (var lr = S.idle + 500; lr <= S.red; lr += 250) tq0 = Math.max(tq0, boostedTorque(S, lr, lb === null ? steadyBoost(S, lr) : lb));
    var hit = tq0 * S.ratios[0] * S.fd * S.eff / S.r / (S.tire.mu * S.pf * S.dgrip * axleN);
    S.slipAssist = S.trType === 'auto' ? 0 : clamp((1.5 - hit) / 0.5, 0, 1);
    // what the body takes before it twists (hp, nitrous included), and the
    // safety gear tech inspection sees (0 none, 1 roll bar, 2 cage). A tube
    // chassis has both covered.
    var tube = DR.partId('weight', inst) === 'w4' || car.shell === Infinity;
    S.shell = tube ? Infinity : car.shell * (chas.shellK || 1);
    S.tech = tube ? 2 : chas.tech || 0;
    S.risk = DR.riskOf(S);
    return S;
  };

  function revMin(S) { return Math.round((S.idle + 2500) / 100) * 100; }
  function revMax(S) { return Math.round((S.mech + 800) / 100) * 100; }

  // the spec with stock gearing, for picking a default shift point before the
  // tune (and with it the gear ratios) is known
  function withRatios(S, ratios) { var o = Object.create(S); o.ratios = ratios; return o; }
  // a box's ratios in a car: the factory box keeps the car's own gearing
  DR.boxRatios = function (trId, car) {
    var r = trId === car.trans && car.gears ? car.gears : DR.TRANS[trId].ratios;
    return r.slice();
  };

  // ---------------------------------------------------------------- tune
  DR.tuneDefaults = function (inst, S) {
    var tr = DR.TRANS[S.transId];
    var auto = tr.type === 'auto';
    var fiDef = S.eng.fi && S.fiId === S.eng.fi.part ? S.eng.fi.boost : Math.min(8, S.maxBoost);
    return {
      boost: fiDef,
      // manuals launch near peak torque, or for a turbo near its full-boost
      // rpm (a 2-step builds boost there before the clutch drops)
      launchRpm: Math.round((auto ? Math.min(S.red - 500, Math.max(S.idle + 1500, S.stall + 200)) :
        S.spool15 ? Math.min(S.red - 700, Math.max(S.tqRpm * 0.85, spoolAt(S, (inst.tune && inst.tune.boost) || fiDef) * 0.95)) : S.tqRpm * 0.85) / 100) * 100,
      psi: S.tire.optP,
      fd: S.car.fd,
      gears: DR.boxRatios(S.transId, S.car),
      shiftRpm: Math.round(Math.min(S.red - 150, DR.suggestShift(withRatios(S, DR.boxRatios(S.transId, S.car)))) / 100) * 100,
      revLimit: S.red,
      springF: 5, springR: 5, rideF: 0, rideR: 0,
      bumpF: 5, rebF: 5, bumpR: 5, rebR: 5, limitF: 0,
      antiSquat: DR.getOption('rearsusp', inst).as,
      barDeg: 3,
      launchThr: 100, thrRamp: 0,
      tcSlip: 0,
      nosDelay: 0.6, nosRamp: 0.5
    };
  };

  function coil(S) { return DR.getOption('springs', { carId: S.carId, parts: S._parts }).adjS; }
  function shk(S) { return DR.getOption('shocks', { carId: S.carId, parts: S._parts }); }
  function rideRange(S) { var sp = DR.getOption('springs', { carId: S.carId, parts: S._parts }); return sp.ride ? [Math.round(sp.ride[0] * 1000), Math.round(sp.ride[1] * 1000)] : [0, 0]; }
  // Ranges for the tuning screen. `show(S)` decides whether it is unlocked.
  DR.TUNE_DEFS = [
    { key: 'revLimit', label: 'Rev Limiter', unit: 'rpm', step: 100, min: revMin, max: revMax,
      show: function (S) { return S.ecu >= 2; }, req: 'Requires a Standalone ECU (a Flash tune raises it automatically)', group: 'Engine',
      help: 'Past your valvetrain or bottom-end limit the valves float and the engine may let go.' },
    { key: 'boost', label: 'Boost Pressure', unit: 'psi', step: 0.5, min: function () { return 0; }, max: function (S) { return S.maxBoost; },
      show: function (S) { return S.fiType !== 'none'; }, req: 'Requires a turbo or supercharger', group: 'Engine',
      help: 'More boost = more power, but watch the knock limit of your fuel and your internals.' },
    { key: 'launchRpm', label: 'Launch RPM (2-Step)', unit: 'rpm', step: 100, min: function (S) { return S.idle + 600; }, max: function (S) { return S.red - 200; },
      show: function (S) { return S.twostep > 0; }, req: 'Requires a 2-step launch control', group: 'Engine',
      help: 'Engine RPM held on the line. Higher = harder launch & more boost, but more wheelspin.' },
    { key: 'launchThr', label: 'Launch Throttle', unit: '%', step: 5, min: function () { return 30; }, max: function () { return 100; },
      show: function (S) { return S.ecu >= 2; }, req: 'Requires a Standalone ECU', group: 'Engine',
      help: 'Throttle limit at the hit. Ramps to 100% over the ramp time below.' },
    { key: 'thrRamp', label: 'Throttle Ramp Time', unit: 's', step: 0.05, min: function () { return 0; }, max: function () { return 2; },
      show: function (S) { return S.ecu >= 2; }, req: 'Requires a Standalone ECU', group: 'Engine',
      help: '0 = no throttle management.' },
    { key: 'tcSlip', label: 'Traction Control', unit: '% slip', step: 1, min: function () { return 0; }, max: function () { return 40; },
      show: function (S) { return S.ecu >= 3; }, req: 'Requires a Race ECU', group: 'Engine',
      help: '0 = off. Cuts power when the drive tires spin past this slip.' },
    { key: 'shiftRpm', label: 'Shift Light / Auto-Shift RPM', unit: 'rpm', step: 100, min: function (S) { return S.idle + 1500; }, max: function (S) { return S.red; },
      show: function () { return true; }, group: 'Drivetrain', help: 'The shift light comes on here. Auto-shift also uses it.' },
    { key: 'fd', label: 'Final Drive Ratio', unit: ':1', step: 0.01, min: function () { return 2.2; }, max: function () { return 6.5; },
      show: function () { return true; }, group: 'Drivetrain', help: 'Higher number = quicker acceleration, lower top speed.' },
    { key: 'gears', label: 'Gear Ratios', unit: '', step: 0.01, min: function () { return 0.5; }, max: function () { return 4.5; },
      show: function (S) { return !!DR.TRANS[S.transId].adj; }, req: 'Requires a sequential race gearbox', group: 'Drivetrain',
      help: 'Each gear individually.' },
    { key: 'psi', label: 'Drive Tire Pressure', unit: 'psi', step: 0.5, min: function () { return 4; }, max: function () { return 45; },
      show: function () { return true; }, group: 'Tires',
      help: 'Each tire has an ideal pressure. A little below it adds grip; too low wrinkles the tire (beadlocks help).' },
    { key: 'rideF', label: 'Front Ride Height', unit: 'mm', step: 5, min: function (S) { return rideRange(S)[0]; }, max: function (S) { return rideRange(S)[1]; },
      show: coil, req: 'Requires adjustable coilovers', group: 'Suspension',
      help: 'Lower drops the CG and the drag but leaves less bump travel. Raise the front over the rear for rake.' },
    { key: 'rideR', label: 'Rear Ride Height', unit: 'mm', step: 5, min: function (S) { return rideRange(S)[0]; }, max: function (S) { return rideRange(S)[1]; },
      show: coil, req: 'Requires adjustable coilovers', group: 'Suspension',
      help: 'Too low and the rear bottoms out on the bump stops at the hit.' },
    { key: 'springF', label: 'Front Spring Rate', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: coil, req: 'Requires adjustable coilovers', group: 'Suspension',
      help: 'Softer lets the nose rise and moves weight to the rear tires.' },
    { key: 'springR', label: 'Rear Spring Rate', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: coil, req: 'Requires adjustable coilovers', group: 'Suspension',
      help: 'Softer squats more and loads the tires gently; stiffer reacts faster.' },
    { key: 'bumpF', label: 'Front Bump', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return shk(S).adjD === 2; }, req: 'Requires double-adjustable shocks', group: 'Suspension',
      help: 'How hard the front resists compressing: firmer cuts nose dive under braking.' },
    { key: 'rebF', label: 'Front Rebound', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return shk(S).adjD >= 1; }, req: 'Requires adjustable shocks', group: 'Suspension',
      help: 'Loose (low) lets the front come up fast. Too loose = big wheelies and a bouncy launch.' },
    { key: 'bumpR', label: 'Rear Bump', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return shk(S).adjD >= 1; }, req: 'Requires adjustable shocks', group: 'Suspension',
      help: 'Firmer hits the tires harder at the launch; softer is gentler on them.' },
    { key: 'rebR', label: 'Rear Rebound', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return shk(S).adjD === 2; }, req: 'Requires double-adjustable shocks', group: 'Suspension',
      help: 'How fast the rear extends again: firmer keeps it planted over bumps and through the shifts.' },
    { key: 'limitF', label: 'Front Travel Limiter', unit: 'mm', step: 5, min: function () { return 0; }, max: function () { return 110; },
      show: function (S) { return !!shk(S).lim; }, req: 'Requires adjustable drag shocks', group: 'Suspension',
      help: 'Caps how far the front can extend (0 = off). Less rise keeps the car flatter but the front tires lift sooner.' },
    { key: 'antiSquat', label: 'Anti-Squat / Instant Centre', unit: '', step: 0.05, min: function (S) { return DR.getOption('rearsusp', { carId: S.carId, parts: S._parts }).asMin || 0.3; },
      max: function (S) { return DR.getOption('rearsusp', { carId: S.carId, parts: S._parts }).asMax || 1.3; },
      show: function (S) { return DR.getOption('rearsusp', { carId: S.carId, parts: S._parts }).adjA; }, req: 'Requires ladder bars or a 4-link', group: 'Suspension',
      help: 'Higher plants the tires harder & lifts the front. Too high can unload the tires or wheelie.' },
    { key: 'barDeg', label: 'Wheelie Bar Height', unit: '°', step: 0.5, min: function () { return 0.5; }, max: function () { return 10; },
      show: function (S) { return S.bar; }, req: 'Requires wheelie bars', group: 'Suspension',
      help: 'Max wheelie angle before the bars touch. Hitting the bars unloads the rear tires.' },
    { key: 'nosDelay', label: 'Nitrous Activation Delay', unit: 's', step: 0.1, min: function () { return 0; }, max: function () { return 4; },
      show: function (S) { return S.prog; }, req: 'Requires a progressive nitrous controller', group: 'Nitrous',
      help: 'Seconds after launch before nitrous comes on by itself.' },
    { key: 'nosRamp', label: 'Nitrous Ramp-In Time', unit: 's', step: 0.1, min: function () { return 0; }, max: function () { return 3; },
      show: function (S) { return S.prog; }, req: 'Requires a progressive nitrous controller', group: 'Nitrous',
      help: 'Seconds to fade from 0 to the full shot.' }
  ];

  DR.fullTune = function (inst, S, over) {
    S._parts = inst.parts || {};
    var d = DR.tuneDefaults(inst, S), t = {}, src = over || inst.tune || {};
    if (src.rebound != null && src.rebF == null) src = Object.assign({}, src, { rebF: src.rebound });   // older saves
    if (src.comp != null && src.bumpR == null) src = Object.assign({}, src, { bumpR: src.comp });
    for (var k in d) t[k] = (src[k] != null) ? src[k] : d[k];
    if (!Array.isArray(t.gears) || t.gears.length !== d.gears.length) t.gears = d.gears;
    DR.TUNE_DEFS.forEach(function (def) {
      if (def.key === 'gears') {
        t.gears = t.gears.map(function (g) { return clamp(g, 0.5, 4.5); });
        return;
      }
      t[def.key] = clamp(t[def.key], def.min(S), def.max(S));
    });
    return t;
  };

  // The parts holding a build back right now: { cat: why }. The shop and
  // install bay flag these.
  DR.bottlenecks = function (S) {
    var out = {}, r = S.risk, hp = S.peakHp + S.nosHp;
    if (hp > S.safeHp) out[S.safeWeak] = 'Can\'t take ' + Math.round(hp) + ' hp';
    if (S.red > S.vtLimit) out.valvetrain = 'Valves float past ' + S.vtLimit + ' rpm';
    if (S.red > S.beLimit) out[S.beWeak] = out[S.beWeak] || 'Not safe past ' + S.beLimit + ' rpm';
    if (S.fuelW < S.peakHp * DR.HP * 1.001) {
      if (S.fuelInj <= S.fuelPump) out.injectors = 'Maxed out';
      if (S.fuelPump <= S.fuelInj) out.fuelpump = 'Maxed out';
    }
    var fs = DR.fuelShort(S);
    if (fs.ratio > 1.02) out[fs.by] = out[fs.by] || (fs.nos ? 'Can\'t feed the nitrous' : 'Running lean');
    if (S.untuned && S.untuned.length) out.ecu = 'Needs a tune';
    if ((S.fiType !== 'none' && S.boostSet > S.sparkPsi) || S.nosCut) out.ignition = 'Misfiring';
    if (S.fiType !== 'none' && S.boostSet > S.knock + 0.5) out.fueltype = 'Knocking at ' + S.boostSet + ' psi';
    if (S.fiType !== 'none' && !S.diesel && S.iat > 75) out.ic = 'Charge is ' + Math.round(S.iat) + ' C (' + Math.round(S.iat * 1.8 + 32) + ' F)';
    if (S.flowW && S.peakHp >= S.flowW / DR.HP * 0.98) out.fi = 'Out of breath';
    if (r.axle > 0.005) out.rearend = 'Axles may snap';
    if (r.trans > 0.005) out.trans = 'Too much torque';
    var tqNm = S.peakTq / 0.7376 + (S.nosW ? S.nosW / (4000 * RPM2W) : 0);
    if (S.clCap && tqNm > S.clCap) out.clutch = 'Slipping';
    return out;
  };

  // Fits the cheapest axles and ignition a build needs (rival builds).
  DR.fitSupport = function (inst) {
    for (var pass = 0; pass < 2; pass++) {
      var S = DR.buildSpec(inst), r = S.risk;
      if (!r.axle && !(S.fiType !== 'none' && S.boostSet > S.sparkPsi) && !S.nosCut) break;
      if (r.axle > 0) {
        var ax = DR.PART_CATS.rearend.options, hit = r.hit;
        for (var i = 1; i < ax.length; i++) if (ax[i].axle >= hit * 1.05 || i === ax.length - 1) { inst.parts.rearend = ax[i].id; break; }
      }
      if ((S.fiType !== 'none' && S.boostSet > S.sparkPsi) || S.nosCut) {
        var ig = DR.PART_CATS.ignition.options, cur = DR.partId('ignition', inst);
        for (var j = 0; j < ig.length; j++) if (ig[j].id === cur) { inst.parts.ignition = ig[Math.min(ig.length - 1, j + 1)].id; break; }
      }
    }
    return inst;
  };

  // ---------------------------------------------------------------- dyno
  DR.dyno = function (S) {
    var pts = [], peakHp = 0, peakTq = 0, peakHpRpm = 0;
    var maxR = S.red + 200;
    for (var rpm = 1000; rpm <= maxR; rpm += 100) {
      var b = steadyBoost(S, rpm);
      var T = boostedTorque(S, rpm, b);
      var hp = T * rpm * RPM2W / DR.HP;
      var lbft = T * 0.7376;
      pts.push({ rpm: rpm, hp: hp, tq: lbft, boost: b });
      if (rpm <= S.red) {
        if (hp > peakHp) { peakHp = hp; peakHpRpm = rpm; }
        if (lbft > peakTq) peakTq = lbft;
      }
    }
    return { pts: pts, peakHp: peakHp, peakTq: peakTq, peakHpRpm: peakHpRpm };
  };

  // The worst failure chance per run, whatever breaks.
  DR.riskMax = function (r) { return Math.max(r.engine, r.trans, r.axle || 0, r.chassis || 0); };
  // Probability (0..1) of engine / gearbox failure on a run.
  // Fuel the build needs against what the injectors and pump feed (hp):
  // the engine's full demand, plus a dry shot (through the injectors) or a
  // wet one (from the pump). { ratio, by: 'injectors' | 'fuelpump', need, cap, nos }
  DR.fuelShort = function (S) {
    var eng = S.fuelDemand || S.peakHp, nos = S.nosHp && S.nosFuel !== 'own' ? S.nosHp : 0;
    var injNeed = eng + (S.nosFuel === 'inj' ? nos : 0), pumpNeed = eng + nos;
    var injCap = S.fuelInj * S.fuelFF, pumpCap = S.fuelPump * S.fuelFF;
    var ri = injNeed / injCap, rp = pumpNeed / pumpCap, inj = ri >= rp;
    return { ratio: Math.max(ri, rp), ri: ri, rp: rp, by: inj ? 'injectors' : 'fuelpump', need: inj ? injNeed : pumpNeed, cap: inj ? injCap : pumpCap, nos: nos > 0 && (inj ? S.nosFuel === 'inj' : true) };
  };
  DR.riskOf = function (S) {
    var r = { engine: 0, trans: 0, notes: [] };
    var over = (S.peakHp + S.nosHp) / S.safeHp;
    var WEAK = S.rotary ? { pistons: 'apex seals', crank: 'eccentric shaft', block: 'housings', oiling: 'oiling' } : { pistons: 'pistons', rods: 'connecting rods', crank: 'crankshaft', block: 'block', oiling: 'oiling' };
    if (over > 1) { r.engine += Math.min(0.85, (over - 1) * 1.6); r.notes.push('Power is ' + Math.round(over * 100) + '% of what the ' + (WEAK[S.safeWeak] || 'internals') + ' can take'); }
    if (S.red > S.mech) {
      r.engine += Math.min(0.7, (S.red - S.mech) / 1000 * 0.8);
      r.notes.push('Rev limiter is ' + (S.red - S.mech) + ' rpm past the ' + (S.vtLimit <= S.beLimit ? 'valvetrain (valve float)' : WEAK[S.beWeak] || 'bottom end'));
    }
    if (S.boostSet > S.sparkPsi + 0.5 && S.fiType !== 'none') r.notes.push('Ignition can\'t light ' + S.boostSet + ' psi - misfiring past ' + S.sparkPsi + ' psi');
    if (S.boostSet > S.knock + 0.5) { r.engine += Math.min(0.6, (S.boostSet - S.knock) * 0.05); r.notes.push('Boost is past the knock limit (' + S.knock + ' psi' + (S.iat > 60 ? ' with a ' + Math.round(S.iat) + ' C charge' : ' on this fuel') + ')'); }
    if (S.fiType !== 'none' && !S.diesel && S.iat > 75) r.notes.push('Hot intake charge: ' + Math.round(S.iat) + ' C (' + Math.round(S.iat * 1.8 + 32) + ' F) at ' + S.boostSet + ' psi - ' + (S.icE ? 'a bigger intercooler' : 'an intercooler') + ', E85 or methanol would cool it');
    // short of fuel it runs lean: it makes what the fuel allows (or the
    // nitrous still hits) until it burns a piston
    var fs = DR.fuelShort(S);
    if (fs.ratio > 1.02) {
      r.engine += Math.min(0.7, (fs.ratio - 1) * 2.5);
      r.notes.push('Running lean: the ' + (fs.by === 'injectors' ? 'injectors feed' : 'fuel pump feeds') + ' ' + Math.round(fs.cap) + ' hp, the engine' + (fs.nos ? ' plus the shot' : '') + ' wants ' + Math.round(fs.need) + ' hp' + (fs.nos && S.nosFuel === 'inj' ? ' (a dry kit adds its fuel through the injectors)' : ''));
    }
    if (S.e85Lean) { r.engine += 0.45; r.notes.push('Alcohol fuel needs ~30% more fuel: on a gasoline tune it runs lean - get a tune'); }
    (S.untuned || []).forEach(function (u) { if (u[0] !== 'fueltype') r.notes.push(u[1] + ' - get an ECU flash'); });
    if (S.flowW && S.peakHp >= S.flowW / DR.HP * 0.98) r.notes.push('Turbo/blower is out of breath - power is limited');
    var tqNm = S.peakTq / 0.7376 + (S.nosW ? S.nosW / (4000 * RPM2W) : 0);
    // gearbox ratings carry a little margin: trouble starts 5% past them
    if (tqNm > S.trMaxTq * 1.05) { r.trans = Math.min(0.75, (tqNm / S.trMaxTq - 1.05) * 1.1); r.notes.push('Torque exceeds what the transmission can hold'); }
    // axles take the launch hit: torque x converter multiplication
    var hit = tqNm * (S.trType === 'auto' ? Math.min(1.4, S.TR / 1.5) : 1) * (S.slider ? 0.9 : 1);
    r.axle = 0; r.hit = hit;
    if (hit > S.axleTq) { r.axle = Math.min(0.7, (hit / S.axleTq - 1) * 1.2); r.notes.push('Launch torque is ' + Math.round(hit / S.axleTq * 100) + '% of what the axles hold'); }
    if (S.nosCut) r.notes.push('Ignition blows out the spark on a ' + S.nosRated + ' shot - get a stronger ignition');
    if (S.clCap && tqNm > S.clCap) r.notes.push('Clutch will slip - consider an upgrade');
    // the body: past what the shell takes it twists on the launch and cracks
    r.chassis = 0;
    var shellX = (S.peakHp + S.nosHp) / (S.shell || Infinity);
    if (shellX > 1) { r.chassis = Math.min(0.6, (shellX - 1) * 0.9); r.notes.push('Power is ' + Math.round(shellX * 100) + '% of what the body takes - fit subframe connectors, a roll bar or a cage'); }
    r.engine = Math.min(0.9, r.engine);
    return r;
  };

  // ---------------------------------------------------------------- simulation
  function Sim(S, opts) {
    opts = opts || {};
    this.S = S;
    this.track = opts.grip || 1.0;
    this.dist = opts.dist || DR.QUARTER;
    this.x = 0; this.v = 0; this.a = 0;
    this.we = S.idle * RPM2W; this.ww = 0;
    this.gear = 0; this.cl = 0; this.clT = 0; this.clRamp = S.engage || 0.3; this.locked = false;
    this.launched = false; this.t = 0; this.time = 0;
    this.boost = 0; this.thr = 0; this.cut = false; this.cutT = 0; this.stepT = 0;
    this.phi = 0; this.dphi = 0; this.z = 0; this.dz = 0;   // body pitch (nose up +) and heave (up +) on the springs
    this.wheelie = false; this.th = 0; this.dth = 0; this.unload = 0; this.onBar = false;
    this.tireT = opts.tireT != null ? opts.tireT : 28;
    this.nosOn = false; this.nosLvl = 0; this.nosT = 0;
    this.shifting = false; this.shiftT = 0; this.sinceShift = 9;
    this.slip = 0; this.F = 0;
    this.peakHp = 0; this.peakTqNm = 0;
    this.crashed = false; this.blown = false; this.broke = false;
    this.failAt = opts.failAt || 0; this.failType = opts.failType || '';
    this.splits = {}; this.etStart = null; this.finished = false;
    this.tcCut = 0; this.brake = 0;
    this.brakeLimited = false; this.creep = 0; this.creepV = 0;
    this.events = [];          // for visuals: 'shift', 'backfire', 'bar', 'land'
    var N0 = S.drive === 'FWD' ? S.m * G * S.f : S.drive === 'AWD' ? S.m * G : S.m * G * (1 - S.f);
    this.N0 = N0;
  }
  DR.Sim = Sim;
  DR.SPLITS = [['60ft', 60 * DR.FT], ['330ft', 330 * DR.FT], ['1/8', DR.EIGHTH], ['1000ft', 1000 * DR.FT], ['1/4', DR.QUARTER]];

  Sim.prototype.rpm = function () { return this.we * W2RPM; };

  // Suspension force (beyond static) at one corner: spring, bump / rebound
  // damping, a stiff bump stop past the bump travel and a droop limit that
  // pulls back once the corner is fully extended.
  function corner(k, cb, cr, bump, droop, c, v) {
    var F = k * c + (v > 0 ? cb : cr) * v;
    if (c > bump) F += 9 * k * (c - bump) + 2 * cb * Math.max(0, v);
    if (c < -droop) F += 9 * k * (c + droop) + 2 * cr * Math.min(0, v);
    return F;
  }

  Sim.prototype.tireForce = function (ww, N, mu) {
    var S = this.S, r = S.r, v = this.v;
    var den = Math.max(Math.abs(v), 2.5);
    var s = (ww * r - v) / den, as = Math.abs(s), x = as / S.tslip, f, df;
    if (x < 1) { f = 2 * x - x * x; df = (2 - 2 * x) / S.tslip; }
    else { var e = Math.exp(-(as - S.tslip) / S.tfk); f = 1 - S.tfall * (1 - e); df = -S.tfall * e / S.tfk; }
    var sg = s < 0 ? -1 : 1;
    return { F: sg * mu * N * f, dF: mu * N * df * r / den, s: s };
  };

  Sim.prototype.tempFactor = function () {
    var t = this.S.tire, T = this.tireT;
    if (T < t.topt) return 1 - t.cold * clamp((t.topt - T) / (t.topt - 20), 0, 1);
    if (T > t.topt + 30) return Math.max(0.8, 1 - (T - t.topt - 30) * 0.005);
    return 1;
  };

  Sim.prototype.launch = function () {
    if (this.launched) return;
    // the clutch comes out at its own engagement rate; how much it is slipped
    // to save the launch depends on the car (S.slipAssist). The throttle is
    // always the driver's.
    this.launched = true; this.t = 0; this.clT = 0; this.clRamp = this.S.engage || 0.3; this.locked = false;
    this.launchW = Math.max(this.we, this.S.idle * RPM2W * 1.3); this.firstLock = false;
  };

  // Standing burnout in the box: the line lock holds the non-driven wheels
  // and the drive tires are free to spin on the wet pad. AWD cars can't.
  Sim.prototype.burnout = function (on) {
    if (on && this.S.drive === 'AWD') return false;
    if (!!on === !!this.burnMode) return !!on;
    this.burnMode = !!on;
    this.gear = 0; this.cl = 0; this.clT = 0; this.clRamp = 0.15; this.locked = false;
    if (!on) { this.ww = 0; this.slip = 0; }
    return !!on;
  };

  Sim.prototype.shiftUp = function () {
    var S = this.S;
    if (!this.launched || this.shifting || this.gear >= S.ratios.length - 1 || this.crashed || this.blown) return false;
    this.shifting = true; this.shiftT = 0; this.sinceShift = 0;
    if (S.trType !== 'manual') { this.gear++; this.locked = false; }
    this.events.push('shift');
    return true;
  };

  // One physics step. inp = {throttle:0..1, nos:bool}
  Sim.prototype.step = function (dt, inp) {
    if (!(dt > 0)) return;
    var S = this.S, m = S.m;
    this.time += dt;
    if (this.launched) this.t += dt;
    var dead = this.crashed || this.blown || this.broke;

    // -------- failures scheduled for this run
    if (this.failAt && this.launched && !dead && this.t >= this.failAt) {
      if (this.failType === 'trans' || this.failType === 'axle' || this.failType === 'chassis') { this.broke = true; this.brokeWhat = this.failType; this.events.push('broke'); }
      else { this.blown = true; this.events.push('blown'); }
      dead = true;
    }

    // -------- throttle & driver aids
    var thrIn = dead || this.finished ? 0 : clamp(inp.throttle || 0, 0, 1);
    if (this.launched && S.ecu >= 2 && S.tune.thrRamp > 0 && this.t < S.tune.thrRamp) {
      var lt = S.tune.launchThr / 100;
      thrIn = Math.min(thrIn, lt + (1 - lt) * this.t / S.tune.thrRamp);
    }
    if (this.launched && S.ecu >= 3 && S.tune.tcSlip > 0) {
      if (this.slip > S.tune.tcSlip / 100) this.tcCut = Math.min(1, this.tcCut + dt * 10);
      else this.tcCut = Math.max(0, this.tcCut - dt * 5);
      thrIn *= 1 - 0.75 * this.tcCut;
    }
    var pre = !this.launched && !this.burnMode;     // sitting on the brakes / transbrake
    // An H-pattern shift: the driver is off the gas with the clutch in (an
    // engine left flat out on the limiter would dump the clutch in the next gear)
    if (this.shifting && S.trType === 'manual') thrIn = 0;
    this.thr += (thrIn - this.thr) * Math.min(1, dt / 0.04);
    var rpm = this.we * W2RPM;

    // -------- ignition cuts: rev limiter, 2-step, sequential shift cut
    var limit = (pre && S.twostep) ? S.tune.launchRpm : S.limit;
    if (rpm > limit) this.cut = true; else if (rpm < limit - (this.launched ? 120 : 60)) this.cut = false;
    var seqCut = this.shifting && (S.trType === 'seq' || S.trType === 'dct');
    var firing = !this.cut && !seqCut;
    // how much of the time the ignition was cut, for the sound (the limiter
    // flickers many times between two frames)
    this.cutT += firing ? 0 : dt; this.stepT += dt;
    if (this.cut && pre && S.twostep && Math.random() < dt * 25) this.events.push('backfire');

    // -------- boost
    var thrB = this.thr;
    if (S.fiType === 'turbo') {
      var sf = clamp((rpm - S.spoolLo) / (S.spoolHi - S.spoolLo), 0, 1);
      var target = S.boostSet * sf * thrB;
      // revving with no load on it (clutch in, in neutral) a turbo makes next
      // to no boost: only a 2-step builds it on the line
      if (pre) target *= 0.1;
      if (pre && S.twostep && thrB > 0.5) {
        var build = clamp((S.tune.launchRpm - S.spoolLo * 0.5) / (S.spoolHi * 0.85 - S.spoolLo * 0.5), 0.15, 1);
        target = Math.max(target, S.boostSet * (S.twostep === 2 ? 0.92 : 0.5) * build);
      }
      if (this.shifting && S.twostep === 2) target = Math.max(target, this.boost);
      // throttle shut for a shift: a blow-off valve keeps the turbo spinning
      var tau = target > this.boost ? S.lag * Math.sqrt(S.spoolHi / Math.max(rpm, 1500)) : (this.shifting || this.sinceShift < 0.2 ? (S.bovT || 0.15) : 0.15);
      this.boost += (target - this.boost) * Math.min(1, dt / tau);
    } else if (S.fiType !== 'none') {
      this.boost = steadyBoost(S, rpm) * thrB;
    }

    // -------- nitrous
    var wantNos = inp.nos || (S.prog && this.launched && this.t >= S.tune.nosDelay);
    this.nosOn = !!(S.nosW && wantNos && this.launched && !dead && !this.finished && this.thr > 0.8 && rpm > 2200);
    if (this.nosOn) {
      this.nosT += dt;
      var ramp = S.prog ? S.tune.nosRamp : 0.05;
      this.nosLvl = ramp > 0 ? Math.min(1, this.nosLvl + dt / ramp) : 1;
    } else this.nosLvl = Math.max(0, this.nosLvl - dt * 8);

    // -------- engine torque
    var wE = Math.max(this.we, 30);
    var fric = S.Tpk * (0.05 + 0.09 * rpm / S.ref);
    var Te;
    if (dead) Te = -fric * 2;
    else if (firing) {
      Te = boostedTorque(S, rpm, this.boost) * this.thr - fric * (1 - this.thr) + this.nosLvl * S.nosW / wE;
      var p = Te * wE;
      if (p / DR.HP > this.peakHp && this.launched) this.peakHp = p / DR.HP;
      if (Te > this.peakTqNm && this.launched) this.peakTqNm = Te;
    } else Te = -fric;
    var idleW = S.idle * RPM2W;
    if (this.we < idleW && !dead) Te += (idleW - this.we) / idleW * S.Tpk * 0.6;   // idle governor

    // -------- normal loads (weight transfer + wheelies)
    var L = S.L, h = S.h, Nr, Nf, mg = m * G;
    if (!this.wheelie) {
      // Body on two suspension corners. Fl: longitudinal force at the ground
      // (drive or brakes) pitches the body about its CG; anti-squat feeds part
      // of the drive force straight into the rear through the links.
      var aF = L - S.b, bR = S.b;
      var Fl = m * this.a, Fj = S.drive !== 'FWD' ? S.as * Math.max(0, this.F || 0) * h / L : 0;
      var cf = -(this.z + aF * this.phi), cr = -(this.z - bR * this.phi);          // compression (+)
      var vf = -(this.dz + aF * this.dphi), vr = -(this.dz - bR * this.dphi);
      var Ff = mg * S.f + corner(S.kf, S.cbF, S.crF, S.bumpF, S.droopF, cf, vf);
      var Fr = mg * (1 - S.f) + corner(S.kr, S.cbR, S.crR, S.bumpR, S.droopR, cr, vr);
      this.dz += dt * (Ff + Fr + Fj - mg) / m;
      this.dphi += dt * (Ff * aF - (Fr + Fj) * bR + Fl * h) / S.Ip;
      this.z += this.dz * dt; this.phi += this.dphi * dt;
      this.cf = cf; this.cr = cr;
      Nr = Fr + Fj; Nf = Ff;
      if (Nf < 0) { this.wheelie = true; this.th = 0; this.dth = 0.02; Nr = mg; Nf = 0; }
    }
    if (this.wheelie) {
      var b = S.b, Ir = S.Ip + m * (b * b + h * h), th = this.th;
      var mom = m * this.a * (b * Math.sin(th) + h * Math.cos(th)) - mg * (b * Math.cos(th) - h * Math.sin(th));
      this.dth += mom / Ir * dt; this.th += this.dth * dt;
      var Fbar = 0, wasOnBar = this.onBar;
      this.onBar = false;
      if (S.bar && this.th >= S.barRad) {
        // the strike (once, coming up onto the bar) kicks load off the tires;
        // riding the bar just carries part of the car's weight
        if (!wasOnBar && this.dth > 0.05) { this.unload = Math.min(0.55 * mg, this.unload + Ir * this.dth / (S.barLen * 0.07)); this.events.push('bar'); }
        this.th = S.barRad; this.dth = Math.min(0, this.dth);
        Fbar = Math.max(0, mom) / S.barLen;
        this.onBar = true;
      }
      if (this.th <= 0 && this.dth <= 0) {
        if (this.dth < -0.6) this.events.push('land');
        // front tires back down: the springs pick up from where the body is,
        // with the nose's fall going into the front corners (bounce, no snap)
        var aL = L - S.b;
        this.dphi += this.dth; this.dz += this.dth * aL * 0.5;
        this.wheelie = false; this.th = 0; this.dth = 0;
      }
      if (this.th > (this.maxTh || 0)) this.maxTh = this.th;
      if (this.th > 1.15 && !this.crashed) { this.crashed = true; this.events.push('crash'); }
      Nr = mg - Fbar; Nf = 0;
    }
    this.unload *= Math.exp(-dt / 0.07);
    Nr = Math.max(Nr - this.unload, 0.05 * mg) + 0.5 * DR.RHO * S.cla * this.v * this.v;
    Nf = Math.max(0, Nf);
    this.Nr = Nr; this.Nf = Nf;
    var N = S.drive === 'FWD' ? Nf : S.drive === 'AWD' ? Nr + Nf : Nr;
    var loadSens = Math.pow(Math.max(N, 100) / this.N0, -0.08);
    var mu = S.tire.mu * this.track * S.pf * this.tempFactor() * S.dgrip * loadSens;
    if (this.track < 1 && S.tire.kind === 'Slick') mu *= 0.93;
    if (this.burnMode) mu *= 0.5;                  // water in the burnout box
    this.mu = mu;

    // -------- drivetrain
    var r = S.r, eta = S.eff;
    var Gr = S.ratios[this.gear] * S.fd;
    var Fx = 0, tf;
    var held = pre || this.finished && this.v < 0.5;
    if (this.burnMode) {
      this.v = 0;
      if (thrIn < 0.1) this.ww *= Math.exp(-dt * 4);           // on the brake between hits
      // clutch in until the revs come up (a driver revs it, then drops it)
      if (S.trType !== 'auto') {
        if (thrIn < 0.25) { this.clT = 0; this.burnDrop = false; }
        else if (!this.burnDrop) { if (this.we >= Math.min(S.red * 0.7, Math.max(S.tqRpm, S.idle + 2500)) * RPM2W) this.burnDrop = true; else this.clT = 0; }
        // the tires hooked and it's bogging: clutch in, rev it, drop it again
        else if (this.we < (S.idle + 700) * RPM2W) { this.burnDrop = false; this.clT = 0; }
      }
    }

    if (held && !this.launched) {
      // On the line: brakes / transbrake hold the car
      this.ww = 0; this.v = 0;
      if (S.trType === 'auto') {
        var K = this.convK();
        var Timp = Math.pow(this.we / K, 2);
        this.we += dt * (Te - Timp) / S.Ie;
        if (!S.tbrake) {
          // Foot brake (no transbrake): more converter torque than the brakes
          // hold and the car creeps forward through them (out of the beams)
          var Thold = Timp * S.TR * Gr * eta, over = Thold - S.brakeHold;
          this.brakeLimited = over > -0.03 * S.brakeHold && thrIn > 0.1;
          if (over > 0) this.creepV += dt * over / (r * m);
          else this.creepV = Math.max(0, this.creepV - dt * 2);
          this.creep += this.creepV * dt;
        }
      } else {
        this.we += dt * Te / S.Ie;
      }
    } else if (this.finished) {
      // Shutdown area: the driver lifts at the stripe, coasts for a moment,
      // then gets on the brakes. Fast cars throw the parachute.
      var since = this.time - this.finishTime;
      this.we += (idleW * 1.4 - this.we) * Math.min(1, dt * 3);
      this.brake = since > 0.45 ? Math.min(1, (since - 0.45) / 0.5) : 0;
      if (this.chute === undefined) this.chute = this.trap > 140 ? 0 : -1;
      if (this.chute >= 0 && since > 0.6) this.chute = Math.min(1, this.chute + dt * 2.5);
      var vv = this.v * this.v;
      var dec = 0.5 * DR.RHO * (S.cda + Math.max(0, this.chute) * 3.2) * vv / m + S.crr * G + this.brake * 6.5;
      this.v = Math.max(0, this.v - dt * dec);
      this.x += this.v * dt;
      this.ww = this.v / r;
      this.a += (-dec - this.a) * Math.min(1, dt / 0.05);
      this.slip = 0;
    } else if (S.trType === 'auto') {
      var shiftScale = 1;
      if (this.shifting) shiftScale = 0.55;
      var K2 = this.convK();
      var wT = this.ww * Gr;
      var SR = this.we > 1 ? wT / this.we : 1;
      // coupling: 1 at stall, falling to 0 as the turbine catches the engine
      var P = 12, sp = Math.pow(Math.min(Math.max(SR, 0), 1.2), P - 1);
      var cs = SR < 1 ? 1 - sp * SR : -Math.min(1, sp * SR - 1);
      var cap2 = Math.pow(this.we / K2, 2);
      var Timp2 = cap2 * cs;
      var TR = SR < 0.85 ? S.TR - (S.TR - 1) * Math.max(SR, 0) / 0.85 : 1;
      var Ttur = Timp2 * TR * shiftScale;
      // the converter is a stiff coupling, so both sides are integrated
      // semi-implicitly using its local slope
      var dcs = SR < 1.2 ? P * sp : 0;                         // -d(cs)/d(SR)
      var kE = Math.max(0, cap2 * (2 * cs + dcs * SR) / Math.max(this.we, 1));
      this.we += dt * (Te - Timp2) / (S.Ie + dt * kE);
      tf = this.tireForce(this.ww, N, mu);
      var Tw = Ttur * Gr * eta;
      var kW = cap2 * dcs * TR * shiftScale * Gr * Gr * eta / Math.max(this.we, 1);
      // the foot brake takes a moment to release; a transbrake lets go instantly
      if (!S.tbrake && this.launched && this.t < 0.18) Tw -= S.brakeHold * (1 - this.t / 0.18);
      this.ww += dt * (Tw - tf.F * r) / (S.Iw + dt * r * Math.max(tf.dF, 0) + dt * kW);
      if (this.ww < 0) this.ww = 0;
      tf = this.tireForce(this.ww, N, mu);
      Fx = tf.F;
    } else {
      // Clutch: manual / sequential / dual-clutch
      if (this.shifting && S.trType === 'manual') this.cl = 0;
      else {
        this.clT += dt;
        var ramp = this.clRamp;
        this.cl = clamp(this.clT / ramp, 0, 1);
      }
      var cap = S.clCap * this.cl;
      // a slipper clutch's base pressure is set under the engine's torque:
      // it slips at the hit so the engine stays up on the boost, and the
      // clamp builds with time until it locks
      if (S.slider && this.launched && this.t < S.slider[1] && !this.shifting) cap = Math.min(cap, S.peakTq / 0.7376 * (S.slider[0] + (1.3 - S.slider[0]) * this.t / S.slider[1]));
      // Launch slip (low-power cars): until the clutch first locks it is let
      // in so the engine doesn't bog below the revs it was launched at, and
      // only as hard as the tires can take, eased back if they start to go.
      // Blended towards a raw dump as the car's torque outgrows its tires.
      if (S.slipAssist > 0 && this.gear === 0 && !this.firstLock && !this.shifting && !this.burnMode) {
        // (no lower than it was launched at, nor higher than its torque and power peaks:
        // slipping a clutch near the limiter just wastes the launch)
        var hold = Math.max(S.idle * RPM2W * 1.3, Math.min(this.launchW * 0.82, (S.tqRpm + S.peakHpRpm) / 2 * RPM2W));
        var held = Math.max(0, Math.max(Te, 0) * 1.05 + (this.we - hold) * S.Ie * 60);
        var spinOver = Math.max(0, this.slip / S.tslip - 1.15);
        held = Math.min(held, mu * N * r / (Gr * eta) * Math.max(0.5, 1.05 - spinOver * 0.5));
        cap = S.slipAssist * Math.min(cap, held) + (1 - S.slipAssist) * cap;
      }
      if (dead) cap = this.broke ? 0 : cap;
      var done = false;
      if (this.locked) {
        var J = S.Ie * Gr * Gr + S.Iw;
        tf = this.tireForce(this.ww, N, mu);
        var wwn = this.ww + dt * (Te * Gr * eta - tf.F * r) / (J + dt * r * Math.max(tf.dF, 0));
        var alphaE = (wwn - this.ww) * Gr / dt;
        var Tcl = Te - S.Ie * alphaE;
        if (Math.abs(Tcl) <= cap && wwn * Gr > idleW * 0.7) {
          this.ww = Math.max(0, wwn); this.we = this.ww * Gr; done = true;
        } else this.locked = false;
      }
      if (!done) {
        var dw = this.we - this.ww * Gr;
        var Tc = Math.abs(dw) < 1e-6 ? 0 : (dw > 0 ? cap : -cap);
        var weN = this.we + dt * (Te - Tc) / S.Ie;
        tf = this.tireForce(this.ww, N, mu);
        var wwN = this.ww + dt * (Tc * Gr * eta - tf.F * r) / (S.Iw + dt * r * Math.max(tf.dF, 0));
        if (wwN < 0) wwN = 0;
        var dwN = weN - wwN * Gr;
        if (this.cl > 0 && dw * dwN <= 0 && wwN * Gr > idleW * 0.7) {
          var wc = (S.Ie * Gr * this.we + S.Iw * wwN) / (S.Ie * Gr * Gr + S.Iw);
          this.ww = wc; this.we = wc * Gr; this.locked = true; this.firstLock = true;
        } else { this.we = weN; this.ww = wwN; }
      }
      if (this.we < idleW * 0.55) this.we = idleW * 0.55;
      tf = this.tireForce(this.ww, N, mu);
      Fx = tf.F;
    }
    if (this.we > (S.red + 1200) * RPM2W) this.we = (S.red + 1200) * RPM2W;
    if (this.we < 0) this.we = 0;

    // -------- shift timing
    this.sinceShift += dt;
    if (this.shifting) {
      this.shiftT += dt;
      if (this.shiftT >= S.shiftTime) {
        this.shifting = false;
        if (S.trType === 'manual') { this.gear++; this.clT = 0; this.clRamp = 0.12; this.locked = false; }
      }
    }

    // -------- body
    if (this.launched && !this.finished) {
      var Fd = 0.5 * DR.RHO * S.cda * this.v * this.v;
      var Fr = this.v > 0.05 ? S.crr * mg : 0;
      var aN = (Fx - Fd - Fr) / (m + 2 * 1.2 / (r * r));
      this.v += aN * dt;
      if (this.v < 0) { this.v = 0; aN = Math.max(aN, 0); }
      this.a += (aN - this.a) * Math.min(1, dt / 0.012);
      if (this.crashed) { this.v *= Math.exp(-dt * 1.5); }
      this.x += this.v * dt;
      if (tf) {
        this.slip = Math.max(0, tf.s);
        this.F = Fx;
        var slipV = Math.max(0, this.ww * r - this.v);
        this.tireT += Math.abs(Fx) * slipV * dt * 3.5e-5 * (30 / S.tire.m);
      }
    } else if (this.burnMode) {
      this.v = 0; this.a = 0; this.x = 0;
      if (tf) {
        this.slip = Math.max(0, tf.s); this.F = Fx;
        this.tireT += Math.abs(Fx) * this.ww * r * dt * 1.1e-4 * (30 / S.tire.m);
      }
    } else if (!this.launched) { this.slip = 0; this.a = 0; }
    this.tireT -= (this.tireT - 25) * 0.006 * dt;

    // -------- timing
    if (this.launched && this.etStart === null && this.x > 0.3) this.etStart = this.time;
    if (this.etStart !== null && !this.finished) {
      for (var i = 0; i < DR.SPLITS.length; i++) {
        var sp = DR.SPLITS[i];
        if (!this.splits[sp[0]] && this.x >= sp[1] && sp[1] <= this.dist + 0.01) {
          this.splits[sp[0]] = { t: this.time - this.etStart, mph: this.v * 2.23694 };
        }
      }
      if (this.x >= this.dist) {
        this.finished = true;
        this.et = this.time - this.etStart;
        this.trap = this.v * 2.23694;
        this.finishTime = this.time;
      }
    }
  };

  Sim.prototype.convK = function () {
    var S = this.S;
    if (!S._K) {
      // converters are matched to the combination: it flashes to its rated
      // stall with this engine's full-boost torque
      var Tst = boostedTorque(S, S.stall, steadyBoost(S, S.stall));
      S._K = S.stall * RPM2W / Math.sqrt(Math.max(Tst, 20));
    }
    return S._K;
  };

  // ---------------------------------------------------------------- AI driver
  // skill 0..1: reaction time, shift accuracy and pedal control.
  DR.AIDriver = function (skill, rnd) {
    rnd = rnd || Math.random;
    this.skill = skill;
    this.react = 0.02 + (1 - skill) * 0.28 + rnd() * 0.06;
    this.shiftErr = (rnd() - 0.5) * 600 * (1 - skill);
    this.launchErr = (rnd() - 0.5) * 1600 * (1 - skill);
    this.pedal = 1;
  };

  // The revs a driver brings a clutch car up to before dropping the clutch
  // (no 2-step): the best of a sweep of short runs, found once per spec.
  DR.aiLaunchRpm = function (S) {
    if (S._aiLaunch) return S._aiLaunch;
    var best = S.tune.launchRpm, bestT = 1e9;
    for (var rpm = S.idle + 900; rpm <= S.limit - 100; rpm += 400) {
      var sim = new Sim(S, { grip: 1, dist: DR.QUARTER, tireT: S.tire.topt });
      var ai = new DR.AIDriver(1, function () { return 0.5; });
      ai.react = 0; ai.launchAt = rpm;
      var dt = 1 / 300, tG = -1.2;
      while (tG < 4 && !sim.crashed) { sim.step(dt, ai.input(sim, tG, dt)); tG += dt; }
      var t = sim.crashed ? 0 : -sim.x;            // furthest down the track 4 s after the green
      if (t < bestT) { bestT = t; best = rpm; }
    }
    S._aiLaunch = best;
    return best;
  };
  // tGreen = seconds since green light (negative before)
  DR.AIDriver.prototype.input = function (sim, tGreen, dt) {
    var S = sim.S, rpm = sim.rpm();
    var inp = { throttle: 1, nos: false };
    if (!sim.launched) {
      var target = S.trType === 'auto' || S.twostep ? S.red : this.launchAt || Math.max(S.idle + 600, DR.aiLaunchRpm(S) + this.launchErr);
      inp.throttle = rpm < target ? 1 : 0;
      // on the foot brake: only as much throttle as the brakes will hold
      if (S.trType === 'auto' && !S.tbrake) {
        this.brk = this.brk == null ? 1 : sim.brakeLimited ? Math.max(0.1, this.brk - dt * 3) : Math.min(1, this.brk + dt * 1.5);
        inp.throttle = Math.min(inp.throttle, this.brk);
      }
      if (tGreen >= this.react) sim.launch();
      return inp;
    }
    // Pedal control: a skilled driver feathers to hold slip near the tire's peak.
    var over = sim.slip / S.tslip;
    // (a tire still has most of its grip a little past its peak, so it only
    // backs off for real wheelspin, and never to a bog)
    if (over > 3 + (1 - this.skill) * 3) this.pedal = Math.max(Math.min(this.pedal, 0.45), this.pedal - dt * (1.5 + 3 * this.skill));
    else if (over < 2) this.pedal = Math.min(1, this.pedal + dt * (2 + 3 * this.skill));
    if (sim.wheelie && sim.th > 0.2 + 0.15 * (1 - this.skill)) this.pedal = Math.min(this.pedal, 0.3);
    // nose way up: right off the gas until it comes down
    if (sim.wheelie && sim.th > 0.4 + 0.1 * (1 - this.skill)) this.pedal = 0;
    inp.throttle = this.pedal;
    var shiftAt = Math.min(S.red - 50, S.tune.shiftRpm + this.shiftErr);
    var lineRpm = sim.ww * S.ratios[sim.gear] * S.fd * 30 / Math.PI;
    var trig = S.trType === 'auto' ? Math.max(lineRpm / 0.95, rpm >= S.limit - 60 ? rpm : 0) : sim.locked ? rpm : lineRpm;
    if (!sim.shifting && sim.sinceShift > 0.25 && trig >= shiftAt) sim.shiftUp();
    inp.nos = sim.gear >= 1 || sim.t > 1.5;
    return inp;
  };

  // Headless run with a good driver: used for ET estimates and opponents.
  DR.simulate = function (S, opts) {
    opts = opts || {};
    var dist = opts.dist || DR.QUARTER;
    var sim = new Sim(S, { grip: opts.grip || 1, dist: dist, tireT: opts.tireT != null ? opts.tireT : S.tire.topt });
    var ai = new DR.AIDriver(opts.skill != null ? opts.skill : 1, function () { return 0.5; });
    ai.react = 0;
    var dt = 1 / 400, tG = -1.2, guard = 0;
    while (!sim.finished && guard < 400 * 60) {
      var inp = ai.input(sim, tG, dt);
      sim.step(dt, inp);
      tG += dt; guard++;
      if (sim.crashed || sim.blown) break;
      if (sim.launched && sim.t > 6 && sim.v < 0.5) break;
    }
    return { et: sim.finished ? sim.et : 99, trap: sim.trap || 0, splits: sim.splits, crashed: sim.crashed, sim: sim };
  };

  // Gear-by-gear optimal shift point (rpm) from the torque curve.
  DR.suggestShift = function (S) {
    var best = [];
    for (var g = 0; g < S.ratios.length - 1; g++) {
      var r1 = S.ratios[g], r2 = S.ratios[g + 1], pick = S.red;
      for (var rpm = S.tqRpm; rpm <= S.red; rpm += 50) {
        var f1 = boostedTorque(S, rpm, steadyBoost(S, rpm)) * r1;
        var rpm2 = rpm * r2 / r1;
        var f2 = boostedTorque(S, rpm2, steadyBoost(S, rpm2)) * r2;
        if (f2 > f1) { pick = rpm; break; }
      }
      best.push(pick);
    }
    if (!best.length) return S.red - 100;
    var avg = best.reduce(function (a, b) { return a + b; }, 0) / best.length;
    return Math.round(Math.min(S.red, avg) / 100) * 100;
  };

  DR.fmtNum = function (x, d) { return x.toFixed(d == null ? 0 : d); };
})();

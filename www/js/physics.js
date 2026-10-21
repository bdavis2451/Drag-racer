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
  function shape(S, rpm) {
    var x = rpm / S.tqRpm, s;
    if (x < 1) s = 1 - S.lowK * (1 - x) * (1 - x);
    else s = 1 - S.highK * (x - 1) * (x - 1);
    return Math.max(0.05, s);
  }

  // Full-throttle torque (Nm) at rpm with a given boost (psi). No nitrous.
  function boostedTorque(S, rpm, boost) {
    var w = Math.max(rpm, 300) * RPM2W;
    var Tna = S.Tpk * shape(S, rpm);
    var be = Math.min(boost, S.knock) + Math.max(0, boost - S.knock) * 0.35;
    var T = Tna * (1 + be / 14.7 * S.icEff);
    if (S.fiType === 'roots' || S.fiType === 'screw' || S.fiType === 'cent')
      T -= S.paras * S.Tpk * (boost / 14.7) * Math.min(1, rpm / S.red) * 1.2;
    if (S.flowW) T = Math.min(T, Math.max(Tna, S.flowW / w));
    T = Math.min(T, S.fuelW / w);
    return T;
  }

  // Boost (psi) a fully spooled system makes at this rpm with full throttle.
  function steadyBoost(S, rpm) {
    if (S.fiType === 'none') return 0;
    if (S.fiType === 'turbo') return S.boostSet * clamp((rpm - S.spoolLo) / (S.spoolHi - S.spoolLo), 0, 1);
    if (S.fiType === 'cent') return S.boostSet * Math.pow(Math.min(rpm, S.red) / S.red, 2);
    return S.boostSet * clamp(rpm / 1800, 0, 1);
  }
  DR.steadyBoost = steadyBoost;

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
    var shift = mods.rpm || 0;
    S.tqRpm = e.tq + shift * 0.7;
    S.pkRpm = e.pk + shift;
    S.red = e.red + (mods.red || 0);
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
      var ds = clamp(Math.sqrt(3.0 / e.disp), 0.6, 1.5);
      S.spoolHi = fi.spool * ds;
      S.spoolLo = S.spoolHi * 0.55;
      S.lag = fi.lag;
    }
    S.paras = fi.paras || 0;
    S.flowW = fi.flow ? fi.flow * DR.HP : 0;
    S.icEff = mods.ic || (fiId.indexOf('fi_oem') === 0 ? 0.92 : 0.82);
    S.knock = e.diesel ? 99 : (mods.knock || 17);
    S.fuelW = 1e12;
    return S;
  }

  // ---------------------------------------------------------------- spec builder
  DR.buildSpec = function (inst, tuneOverride) {
    var car = DR.CARS[inst.carId];
    var engId = inst.engine || car.engine, e = DR.ENGINES[engId];
    var o = function (cat) { return DR.getOption(cat, inst); };
    var intake = o('intake'), exh = o('exhaust'), hdr = o('headers'), cams = o('cams'), heads = o('heads');
    var intl = o('internals'), fsys = o('fuelsys'), fuel = o('fueltype'), ecu = o('ecu');
    var ic = o('ic'), launch = o('launch'), nos = o('nitrous'), nosc = o('nosctrl');
    var trId = DR.partId('trans', inst), tr = DR.TRANS[trId];
    var clutch = o('clutch'), conv = o('converter'), fly = o('flywheel'), shaft = o('driveshaft'), diff = o('diff');
    var layout = o('layout'), springs = o('springs'), shocks = o('shocks'), rs = o('rearsusp'), bar = o('wheeliebar');
    var aero = o('aero'), wheels = o('wheels'), ftires = o('ftires'), wt = o('weight');
    var tireId = DR.partId('rtires', inst), tire = DR.TIRES[tireId], stockTire = DR.TIRES[car.tire];
    var fiId = DR.partId('fi', inst);
    var stockEng = DR.ENGINES[car.engine];

    var tqMul = intake.tq * exh.tq * hdr.tq * cams.tq * heads.tq * ecu.tq * (e.diesel ? 1 : fuel.fmul);
    var mods = {
      rpm: (intake.rpm || 0) + (exh.rpm || 0) + (hdr.rpm || 0) + (cams.rpm || 0) + (heads.rpm || 0),
      red: Math.min(1600, (cams.red || 0) + (intl.red || 0) * 0.5),
      low: (intake.low || 0) + (cams.low || 0),
      fi: fiId,
      ic: ic.ic || 0,
      knock: fuel.knock
    };
    var S = engineCore(e, mods, stockTpk(engId) * tqMul);
    S.carId = inst.carId; S.car = car; S.engId = engId; S.eng = e;
    S.name = car.name;
    S.diesel = !!e.diesel;
    S.limit = S.red;
    S.safeHp = e.safe * intl.safe;
    var stockFuelHp = Math.max(e.hp * 1.35 + 60, 300);
    S.fuelW = (fsys.fuel || stockFuelHp) * (e.diesel ? 1 : fuel.ff) * DR.HP;
    S.ecu = ecu.ecu;
    S.twostep = launch.twostep;
    S.nosW = nos.nos * DR.HP;
    S.nosHp = nos.nos;
    S.prog = nosc.prog && nos.nos > 0;
    S.Ie = (0.06 + 0.022 * e.disp + (e.diesel ? 0.25 : 0)) * fly.fly;

    // ---- drivetrain
    S.transId = trId; S.trType = tr.type; S.shiftTime = tr.shift; S.trMaxTq = tr.maxTq; S.tbrake = !!tr.tbrake;
    S.drive = layout.layout || car.drive;
    S.eff = tr.eff * (S.drive === 'AWD' ? 0.94 : 1);
    if (tr.type === 'auto') {
      S.stall = conv.stall; S.TR = conv.tr;
    } else {
      var stockTqNm = stockEng.hp * DR.HP / (stockEng.pk * RPM2W) * 1.3;
      S.clCap = clutch.cap || Math.max(420, stockTqNm * 1.4);
      S.engage = clutch.engage;
      S.slider = clutch.id === 'cl5';
    }
    S.dgrip = diff.dgrip;

    // ---- tires & rotating mass
    S.tireId = tireId; S.tire = tire;
    S.r = tire.r;
    S.tslip = tire.slip; S.tfall = tire.fall;
    S.bead = !!wheels.bead;
    var wheelMass = 22 + wheels.wm;
    var Iaxle = tire.m * tire.r * tire.r * 0.75 + wheelMass * Math.pow(tire.r * 0.55, 2) + 0.9 * shaft.shaft;
    S.Iw = Iaxle * (S.drive === 'AWD' ? 1.8 : 1);

    // ---- mass & geometry
    var share = car.ep === 'front' ? 0.9 : car.ep === 'mid' ? 0.15 : -0.2;
    var chassis = (car.m - stockEng.w) * (1 - wt.wr);
    var chassisFront = (car.m * car.f - stockEng.w * share) * (1 - wt.wr);
    var fiW = (fiId !== 'none' && DR.FI[fiId].price) ? DR.FI[fiId].w : 0;
    var extraRear = (tire.m - stockTire.m) + wheels.wm + (bar.bar ? 12 : 0) + (aero.cla ? 8 : 0) + (nos.nos ? 18 : 0);
    var extraFront = ftires.fm + (S.drive === 'AWD' && car.drive !== 'AWD' ? 60 : 0) + fiW * share;
    var extraMid = (S.drive === 'AWD' && car.drive !== 'AWD' ? 30 : 0);
    S.m = chassis + e.w + fiW + extraRear + extraFront + extraMid;
    var front = chassisFront + e.w * share + extraFront + extraMid * 0.5;
    S.f = clamp(front / S.m, 0.2, 0.72);
    S.L = car.wb;
    S.b = S.L * S.f;                      // CG to rear axle
    S.h = car.h - (springs.low || 0) - (wt.low || 0) + (tire.r - stockTire.r) * 0.5;
    S.cda = car.cda + aero.dcda;
    S.cla = aero.cla;
    S.Ip = S.m * S.L * S.L * 0.19;

    // ---- tune
    var T = DR.fullTune(inst, S, tuneOverride);
    S.tune = T;
    S.boostSet = S.fiType === 'none' ? 0 : T.boost;
    S.ratios = tr.adj ? T.gears.slice() : tr.ratios.slice();
    S.fd = T.fd;

    // tire pressure
    var d = (T.psi - tire.optP) / tire.optP;
    var pf = d <= 0 ? 1 + 0.25 * (-d) - (S.bead ? 0.55 : 1.4) * d * d : 1 - 0.5 * d - 0.6 * d * d;
    if (T.psi < 9 && !S.bead) pf *= 0.82;          // tire spins on the rim
    S.pf = clamp(pf, 0.4, 1.1);
    S.crr = 0.012 * (1 + Math.max(0, -d) * 0.6) * ftires.roll;

    // suspension
    S.as = rs.adjA ? T.antiSquat : rs.as;
    var kmul = springs.sk * (springs.adjS ? 0.55 + 0.09 * T.springR : 1);
    var wn = 2 * Math.PI * 1.6 * Math.sqrt(kmul);
    S.kphi = S.Ip * wn * wn;
    var z = shocks.z + (shocks.adjD ? (T.rebound - 5) * 0.035 + (T.comp - 5) * 0.035 : 0);
    z = clamp(z, 0.1, 0.95);
    S.cphi = 2 * z * Math.sqrt(S.kphi * S.Ip);
    S.hmul = (1 + (springs.adjS ? (5 - T.springF) * 0.012 : 0) + (shocks.adjD ? (5 - T.rebound) * 0.01 : 0)) *
      (1 + 0.45 * (S.as - 0.5)) * (shocks.pro ? 1.02 : 1) * (rs.pro ? 1.02 : 1);
    S.bar = !!bar.bar;
    S.barRad = T.barDeg * Math.PI / 180;
    S.barLen = 1.6;

    // ---- summary numbers
    var dyno = DR.dyno(S);
    S.peakHp = dyno.peakHp; S.peakTq = dyno.peakTq; S.peakHpRpm = dyno.peakHpRpm;
    S.totalHp = S.peakHp + S.nosHp;
    S.risk = DR.riskOf(S);
    return S;
  };

  // ---------------------------------------------------------------- tune
  DR.tuneDefaults = function (inst, S) {
    var tr = DR.TRANS[S.transId];
    var auto = tr.type === 'auto';
    var fiDef = S.eng.fi && S.fiId === S.eng.fi.part ? S.eng.fi.boost : Math.min(8, S.maxBoost);
    return {
      boost: fiDef,
      launchRpm: Math.round((auto ? Math.max(S.idle + 1500, S.tqRpm * 0.7) : S.tqRpm * 0.85) / 100) * 100,
      psi: S.tire.optP,
      fd: S.car.fd,
      gears: tr.ratios.slice(),
      shiftRpm: Math.round((S.red - 150) / 100) * 100,
      springF: 5, springR: 5, rebound: 5, comp: 5,
      antiSquat: DR.getOption('rearsusp', inst).as,
      barDeg: 3,
      launchThr: 100, thrRamp: 0,
      tcSlip: 0,
      nosDelay: 0.6, nosRamp: 0.5
    };
  };

  // Ranges for the tuning screen. `show(S)` decides whether it is unlocked.
  DR.TUNE_DEFS = [
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
    { key: 'springF', label: 'Front Spring Rate', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return DR.getOption('springs', { carId: S.carId, parts: S._parts }).adjS; }, req: 'Requires adjustable coilovers', group: 'Suspension',
      help: 'Softer front lets the nose rise and pushes weight to the rear.' },
    { key: 'springR', label: 'Rear Spring Rate', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return DR.getOption('springs', { carId: S.carId, parts: S._parts }).adjS; }, req: 'Requires adjustable coilovers', group: 'Suspension',
      help: 'Softer rear squats more slowly; stiffer reacts faster.' },
    { key: 'rebound', label: 'Front Shock Rebound', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return DR.getOption('shocks', { carId: S.carId, parts: S._parts }).adjD; }, req: 'Requires adjustable shocks', group: 'Suspension',
      help: 'Loose (low) lets the front come up fast. Too loose = big wheelies and bouncing.' },
    { key: 'comp', label: 'Rear Shock Compression', unit: '', step: 1, min: function () { return 1; }, max: function () { return 10; },
      show: function (S) { return DR.getOption('shocks', { carId: S.carId, parts: S._parts }).adjD; }, req: 'Requires adjustable shocks', group: 'Suspension',
      help: 'Stiffer hits the tire harder at launch; softer is gentler.' },
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

  // Probability (0..1) of engine / gearbox failure on a run.
  DR.riskOf = function (S) {
    var r = { engine: 0, trans: 0, notes: [] };
    var over = (S.peakHp + S.nosHp) / S.safeHp;
    if (over > 1) { r.engine += Math.min(0.85, (over - 1) * 1.6); r.notes.push('Power is ' + Math.round(over * 100) + '% of what the internals can take'); }
    if (S.boostSet > S.knock + 0.5) { r.engine += Math.min(0.6, (S.boostSet - S.knock) * 0.05); r.notes.push('Boost is past the knock limit of the fuel (' + S.knock + ' psi)'); }
    if (S.fuelW < (S.peakHp * DR.HP) * 1.001) r.notes.push('Fuel system is maxed out - power is limited');
    if (S.flowW && S.peakHp >= S.flowW / DR.HP * 0.98) r.notes.push('Turbo/blower is out of breath - power is limited');
    var tqNm = S.peakTq / 0.7376 + (S.nosW ? S.nosW / (4000 * RPM2W) : 0);
    if (tqNm > S.trMaxTq) { r.trans = Math.min(0.75, (tqNm / S.trMaxTq - 1) * 1.1); r.notes.push('Torque exceeds what the transmission can hold'); }
    if (S.clCap && tqNm > S.clCap) r.notes.push('Clutch will slip - consider an upgrade');
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
    this.boost = 0; this.thr = 0; this.cut = false;
    this.phi = 0; this.dphi = 0;
    this.wheelie = false; this.th = 0; this.dth = 0; this.unload = 0; this.onBar = false;
    this.tireT = opts.tireT != null ? opts.tireT : 28;
    this.nosOn = false; this.nosLvl = 0; this.nosT = 0;
    this.shifting = false; this.shiftT = 0; this.sinceShift = 9;
    this.slip = 0; this.F = 0;
    this.peakHp = 0; this.peakTqNm = 0;
    this.crashed = false; this.blown = false; this.broke = false;
    this.failAt = opts.failAt || 0; this.failType = opts.failType || '';
    this.splits = {}; this.etStart = null; this.finished = false;
    this.tcCut = 0;
    this.events = [];          // for visuals: 'shift', 'backfire', 'bar', 'land'
    var N0 = S.drive === 'FWD' ? S.m * G * S.f : S.drive === 'AWD' ? S.m * G : S.m * G * (1 - S.f);
    this.N0 = N0;
  }
  DR.Sim = Sim;
  DR.SPLITS = [['60ft', 60 * DR.FT], ['330ft', 330 * DR.FT], ['1/8', DR.EIGHTH], ['1000ft', 1000 * DR.FT], ['1/4', DR.QUARTER]];

  Sim.prototype.rpm = function () { return this.we * W2RPM; };

  Sim.prototype.tireForce = function (ww, N, mu) {
    var S = this.S, r = S.r, v = this.v;
    var den = Math.max(Math.abs(v), 2.5);
    var s = (ww * r - v) / den, as = Math.abs(s), x = as / S.tslip, f, df;
    if (x < 1) { f = 2 * x - x * x; df = (2 - 2 * x) / S.tslip; }
    else { var e = Math.exp(-(x - 1) / 1.5); f = 1 - S.tfall * (1 - e); df = -S.tfall * e / 1.5 / S.tslip; }
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
    this.launched = true; this.t = 0; this.clT = 0; this.clRamp = this.S.engage || 0.3; this.locked = false;
    this.launchW = Math.max(this.we, this.S.idle * RPM2W * 1.3); this.firstLock = false;
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
    var S = this.S, m = S.m;
    this.time += dt;
    if (this.launched) this.t += dt;
    var dead = this.crashed || this.blown || this.broke;

    // -------- failures scheduled for this run
    if (this.failAt && this.launched && !dead && this.t >= this.failAt) {
      if (this.failType === 'trans') { this.broke = true; this.events.push('broke'); }
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
    this.thr += (thrIn - this.thr) * Math.min(1, dt / 0.04);
    var rpm = this.we * W2RPM;

    // -------- ignition cuts: rev limiter, 2-step, sequential shift cut
    var limit = (!this.launched && S.twostep) ? S.tune.launchRpm : S.limit;
    if (rpm > limit) this.cut = true; else if (rpm < limit - (this.launched ? 120 : 60)) this.cut = false;
    var seqCut = this.shifting && (S.trType === 'seq' || S.trType === 'dct');
    var firing = !this.cut && !seqCut;
    if (this.cut && !this.launched && S.twostep && Math.random() < dt * 25) this.events.push('backfire');

    // -------- boost
    var thrB = this.thr;
    if (S.fiType === 'turbo') {
      var sf = clamp((rpm - S.spoolLo) / (S.spoolHi - S.spoolLo), 0, 1);
      var target = S.boostSet * sf * thrB;
      if (!this.launched && S.twostep && thrB > 0.5) {
        var build = clamp((S.tune.launchRpm - S.spoolLo * 0.5) / (S.spoolHi * 0.85 - S.spoolLo * 0.5), 0.15, 1);
        target = Math.max(target, S.boostSet * (S.twostep === 2 ? 0.92 : 0.5) * build);
      }
      if (this.shifting && S.twostep === 2) target = Math.max(target, this.boost);
      var tau = target > this.boost ? S.lag * Math.sqrt(S.spoolHi / Math.max(rpm, 1500)) : 0.15;
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
    var fric = S.Tpk * (0.05 + 0.09 * rpm / S.red);
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
    var L = S.L, h = S.h * S.hmul, Nr, Nf, mg = m * G;
    var Nr0 = mg * (1 - S.f);
    if (!this.wheelie) {
      var M = m * this.a * h;
      var ddphi = (M * (1 - S.as) - S.kphi * this.phi - S.cphi * this.dphi) / S.Ip;
      this.dphi += ddphi * dt; this.phi += this.dphi * dt;
      var dN = (S.as * M + S.kphi * this.phi + S.cphi * this.dphi) / L;
      Nr = Nr0 + dN; Nf = mg - Nr;
      if (Nf < 0) { this.wheelie = true; this.th = 0; this.dth = 0.02; }
    }
    if (this.wheelie) {
      var b = S.b, Ir = S.Ip + m * (b * b + h * h), th = this.th;
      var mom = m * this.a * (b * Math.sin(th) + h * Math.cos(th)) - mg * (b * Math.cos(th) - h * Math.sin(th));
      this.dth += mom / Ir * dt; this.th += this.dth * dt;
      var Fbar = 0;
      this.onBar = false;
      if (S.bar && this.th >= S.barRad) {
        if (this.dth > 0.05) { this.unload = Math.min(0.55 * mg, this.unload + Ir * this.dth / (S.barLen * 0.07)); this.events.push('bar'); }
        this.th = S.barRad; this.dth = Math.min(0, this.dth);
        Fbar = Math.max(0, mom) / S.barLen;
        this.onBar = true;
      }
      if (this.th <= 0 && this.dth <= 0) {
        if (this.dth < -0.6) this.events.push('land');
        this.wheelie = false; this.th = 0; this.dth = 0; this.phi = 0; this.dphi = 0;
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
    this.mu = mu;

    // -------- drivetrain
    var r = S.r, eta = S.eff;
    var Gr = S.ratios[this.gear] * S.fd;
    var Fx = 0, tf;
    var held = !this.launched || this.finished && this.v < 0.5;

    if (held && !this.launched) {
      // On the line: brakes / transbrake hold the car
      this.ww = 0; this.v = 0;
      if (S.trType === 'auto') {
        var K = this.convK();
        var Timp = Math.pow(this.we / K, 2);
        this.we += dt * (Te - Timp) / S.Ie;
      } else {
        this.we += dt * Te / S.Ie;
      }
    } else if (this.finished) {
      // Past the finish: off throttle, clutch in, brakes + chute
      this.we += (idleW * 1.4 - this.we) * Math.min(1, dt * 3);
      this.v = Math.max(0, this.v - dt * (this.v > 40 ? 9 : 7));
      this.ww = this.v / r;
      this.a = -8;
    } else if (S.trType === 'auto') {
      var shiftScale = 1;
      if (this.shifting) shiftScale = 0.55;
      var K2 = this.convK();
      var wT = this.ww * Gr;
      var SR = this.we > 1 ? wT / this.we : 1;
      var cs = SR < 1 ? 1 - Math.pow(Math.max(SR, 0), 6) : -Math.min(1, Math.pow(SR, 6) - 1);
      var Timp2 = Math.pow(this.we / K2, 2) * cs;
      var TR = SR < 0.85 ? S.TR - (S.TR - 1) * Math.max(SR, 0) / 0.85 : 1;
      var Ttur = Timp2 * TR * shiftScale;
      this.we += dt * (Te - Timp2) / S.Ie;
      tf = this.tireForce(this.ww, N, mu);
      var Tw = Ttur * Gr * eta;
      this.ww += dt * (Tw - tf.F * r) / (S.Iw + dt * r * Math.max(tf.dF, 0));
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
        if (S.slider && this.t < 1.2) this.cl = Math.min(this.cl, 0.55 + 0.45 * this.t / 1.2);
      }
      var cap = S.clCap * this.cl;
      // Launch: the driver feathers the clutch to hold RPM near where it was
      // dumped, until the car catches up and the clutch locks for the first time.
      if (this.gear === 0 && !this.firstLock && !this.shifting) {
        var hold = this.launchW * 0.82;
        cap = Math.min(cap, Math.max(0, Math.max(Te, 0) * 1.05 + (this.we - hold) * S.Ie * 60));
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
      var Tst = boostedTorque(S, S.stall, 0);
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
    this.pedal = 1;
  };
  // tGreen = seconds since green light (negative before)
  DR.AIDriver.prototype.input = function (sim, tGreen, dt) {
    var S = sim.S, rpm = sim.rpm();
    var inp = { throttle: 1, nos: false };
    if (!sim.launched) {
      var target = S.trType === 'auto' ? S.red : (S.twostep ? S.red : S.tune.launchRpm);
      inp.throttle = rpm < target ? 1 : 0;
      if (tGreen >= this.react) sim.launch();
      return inp;
    }
    // Pedal control: a skilled driver feathers to hold slip near the tire's peak.
    var over = sim.slip / S.tslip;
    if (over > 1.6 + (1 - this.skill) * 3) this.pedal = Math.max(0.25, this.pedal - dt * (2 + 8 * this.skill));
    else if (over < 1.25) this.pedal = Math.min(1, this.pedal + dt * (1.5 + 3 * this.skill));
    if (sim.wheelie && sim.th > 0.2 + 0.15 * (1 - this.skill)) this.pedal = Math.min(this.pedal, 0.3);
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

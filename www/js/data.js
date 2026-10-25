// ===========================================================================
// PIXEL DRAG — core game data: engines, transmissions, tires and vehicles.
// All physics values are SI (kg, m, N, Nm) unless named otherwise.
// Horsepower figures are crank hp at stock tune.
// ===========================================================================
var DR = (typeof globalThis !== 'undefined' ? globalThis : window).DR || {};
(typeof globalThis !== 'undefined' ? globalThis : window).DR = DR;

DR.G = 9.81;
DR.RHO = 1.2;
DR.HP = 745.7;              // watts per hp
DR.QUARTER = 402.336;       // m
DR.EIGHTH = 201.168;        // m
DR.FT = 0.3048;

// ---------------------------------------------------------------------------
// ENGINES (stock figures are the published ratings of the real engine)
//  hp      : stock crank hp (with stock forced induction if any)
//  pk      : rpm of peak hp        tq : rpm of peak torque
//  red     : redline rpm           w  : weight kg, dressed (accessories,
//            manifolds and factory turbos / blower; no transmission)
//  safe    : hp the stock internals survive
//  fi      : factory forced induction {part, boost}
//  bg, bp  : the race-build potential. With every breathing upgrade
//            (intake, exhaust, headers, cams, heads, ECU) the engine makes
//            bg x its stock power (naturally aspirated equivalent) with the
//            power peak at bp rpm. Engines with poor stock heads and cams
//            (Fox 5.0, 454, 350) have far more to gain than modern ones.
// ---------------------------------------------------------------------------
DR.ENGINES = {
  i3_10:   { name: '1.0L I3 (Geo G10)',           cyl: 3,  disp: 1.0, hp: 55,   pk: 5700, tq: 3300, red: 6000, w: 68,  price: 800, lvl: 2, safe: 120, bg: 1.85, bp: 7600 },
  f4_16:   { name: '1.6L Air-Cooled Flat-4',      cyl: 4,  disp: 1.6, hp: 50,   pk: 4400, tq: 2800, red: 5000, w: 105,  price: 900, lvl: 2, safe: 150, bg: 2.28,  bp: 6600 },
  i4_15:   { name: '1.5L I4 SOHC (D15)',          cyl: 4,  disp: 1.5, hp: 102,  pk: 5900, tq: 4900, red: 6800, w: 110, price: 1400, lvl: 2, safe: 220, bg: 1.5,  bp: 8000 },
  i4_23:   { name: '2.3L I4 SOHC (Lima)',         cyl: 4,  disp: 2.3, hp: 90,   pk: 3800, tq: 2600, red: 5000, w: 145, price: 1000, lvl: 2, safe: 170, bg: 1.85, bp: 6400, soundAs: 'i4_20' },
  i4_16:   { name: '1.6L I4 DOHC (4A-GE)',        cyl: 4,  disp: 1.6, hp: 116,  pk: 6600, tq: 5200, red: 7600, w: 120, price: 2000, lvl: 3, safe: 240, bg: 1.66,  bp: 8800 },
  // budget swaps (lvl: shop level they open at, earlier than their price says)
  i4_16sc: { name: '1.6L I4 Supercharged (4A-GZE)', cyl: 4, disp: 1.6, hp: 165, pk: 6400, tq: 4400, red: 7400, w: 132, price: 2900, lvl: 2, safe: 260, fi: { part: 'fi_oem_sc', boost: 9 }, bg: 1.4, bp: 7800, soundAs: 'i4_16' },
  i4_16b:  { name: '1.6L I4 20V (4A-GE Blacktop)', cyl: 4, disp: 1.6, hp: 165, pk: 7800, tq: 6400, red: 8200, w: 125, price: 2900, lvl: 2, safe: 260, bg: 1.35, bp: 8800, soundAs: 'i4_16' },
  i4_23t:  { name: '2.3L I4 Turbo (Lima SVO)',    cyl: 4,  disp: 2.3, hp: 205,  pk: 5000, tq: 3000, red: 6000, w: 165, price: 4300, lvl: 2, safe: 340, fi: { part: 'fi_oem_s', boost: 14 }, bg: 1.35, bp: 6800, soundAs: 'i4_20t' },
  i4_20k:  { name: '2.0L I4 i-VTEC (K20A)',       cyl: 4,  disp: 2.0, hp: 220,  pk: 8000, tq: 7000, red: 8600, w: 140, price: 4900, lvl: 3, safe: 400, bg: 1.3,  bp: 9200, vtec: 5800, soundAs: 'i4_20hi' },
  i4_20t3s:{ name: '2.0L I4 Turbo (3S-GTE)',      cyl: 4,  disp: 2.0, hp: 245,  pk: 6000, tq: 4000, red: 7200, w: 165, price: 6200, lvl: 3, safe: 500, fi: { part: 'fi_oem_s', boost: 13 }, bg: 1.3, bp: 7800, soundAs: 'i4_20t' },
  i4_18:   { name: '1.8L I4 DOHC VTEC (B18C)',    cyl: 4,  disp: 1.8, hp: 195,  pk: 8000, tq: 7500, red: 8400, w: 130, price: 4500, lvl: 3, safe: 330, bg: 1.25, bp: 9200, vtec: 5200 },
  i4_20:   { name: '2.0L I4 DOHC',                cyl: 4,  disp: 2.0, hp: 150,  pk: 6500, tq: 5500, red: 6800, w: 135, price: 2500, lvl: 3, safe: 300, bg: 1.45, bp: 8000 },
  i4_20hi: { name: '2.0L I4 High-Rev (F20C)',     cyl: 4,  disp: 2.0, hp: 240,  pk: 8300, tq: 7500, red: 9000, w: 150, price: 9000, lvl: 4, safe: 380, bg: 1.2,  bp: 9500, vtec: 6000 },
  i4_20t:  { name: '2.0L I4 Turbo',               cyl: 4,  disp: 2.0, hp: 220,  pk: 6000, tq: 3800, red: 7000, w: 160, price: 7000, lvl: 4, safe: 480, fi: { part: 'fi_oem_s', boost: 15 }, bg: 1.48, bp: 7800 },
  i4_20tev:{ name: '2.0L I4 Turbo (4G63)',        cyl: 4,  disp: 2.0, hp: 286,  pk: 6500, tq: 3500, red: 7000, w: 180, price: 9000, lvl: 4, safe: 520, fi: { part: 'fi_oem_s', boost: 19 }, bg: 1.3, bp: 8000 },
  f4_25t:  { name: '2.5L Boxer-4 Turbo (EJ257)',  cyl: 4,  disp: 2.5, hp: 300,  pk: 6000, tq: 4000, red: 7000, w: 175, price: 8600, lvl: 4, safe: 460, fi: { part: 'fi_oem_s', boost: 15 }, bg: 1.25, bp: 7600 },
  rot_13t: { name: '1.3L Twin-Rotor Turbo (13B)', cyl: 2,  disp: 1.3, hp: 255,  pk: 6500, tq: 5000, red: 8000, w: 180, price: 9000, lvl: 4, safe: 420, fi: { part: 'fi_oem_tt', boost: 10 }, rotary: true, bg: 1.7, bp: 9200 },
  i6_30:   { name: '3.0L I6 DOHC (2JZ-GE)',       cyl: 6,  disp: 3.0, hp: 220,  pk: 5800, tq: 4800, red: 6800, w: 200, price: 5100, lvl: 3, safe: 450, bg: 1.4,  bp: 7500 },
  i6_32:   { name: '3.2L I6 High-Rev (S54)',      cyl: 6,  disp: 3.2, hp: 333,  pk: 7900, tq: 4900, red: 8000, w: 210, price: 10400, lvl: 4, safe: 480, bg: 1.2,  bp: 8600 },
  i6_26tt: { name: '2.6L I6 Twin-Turbo (RB26)',   cyl: 6,  disp: 2.6, hp: 320,  pk: 6800, tq: 4400, red: 8000, w: 255, price: 14000, lvl: 5, safe: 650, fi: { part: 'fi_oem_tt', boost: 12 }, bg: 1.14, bp: 8500 },
  i6_30tt: { name: '3.0L I6 Twin-Turbo (2JZ-GTE)', cyl: 6, disp: 3.0, hp: 320,  pk: 5600, tq: 4000, red: 6800, w: 240, price: 17800, lvl: 5, safe: 900, fi: { part: 'fi_oem_tt', boost: 12 }, bg: 1.35, bp: 7800 },
  v6_35:   { name: '3.5L V6 DOHC (VQ35)',         cyl: 6,  disp: 3.5, hp: 287,  pk: 6200, tq: 4800, red: 6600, w: 190, price: 8000, lvl: 3, safe: 420, bg: 1.3,  bp: 7600 },
  v6_38:   { name: '3.8L V6 (3800 Series II)',    cyl: 6,  disp: 3.8, hp: 200,  pk: 5200, tq: 4000, red: 6000, w: 190, price: 4200, lvl: 3, safe: 320, bg: 1.5,  bp: 6600, soundAs: 'v6_35' },
  v6_38sc: { name: '3.8L V6 Supercharged (L67 3800)', cyl: 6, disp: 3.8, hp: 240, pk: 5200, tq: 3600, red: 6000, w: 205, price: 5800, lvl: 2, safe: 420, fi: { part: 'fi_oem_sc', boost: 8 }, bg: 1.3, bp: 6400, soundAs: 'v6_35', scSound: 'roots' },
  v6_38t:  { name: '3.8L V6 Turbo (Buick)',       cyl: 6,  disp: 3.8, hp: 245,  pk: 4400, tq: 3000, red: 5500, w: 215, price: 6700, lvl: 4, safe: 520, fi: { part: 'fi_oem_s', boost: 15 }, bg: 1.45, bp: 6200 },
  v6_38gnx:{ name: '3.8L V6 Turbo (GNX)',         cyl: 6,  disp: 3.8, hp: 300,  pk: 4400, tq: 3000, red: 5500, w: 220, price: 8600, lvl: 4, safe: 560, fi: { part: 'fi_oem_s', boost: 15 }, bg: 1.33, bp: 6200 },
  v6_38tt: { name: '3.8L V6 Twin-Turbo (VR38)',   cyl: 6,  disp: 3.8, hp: 565,  pk: 6800, tq: 3300, red: 7100, w: 265, price: 28000, lvl: 5, safe: 900, fi: { part: 'fi_oem_tt', boost: 14 }, bg: 1.2, bp: 7600 },
  f6_38tt: { name: '3.8L Flat-6 Twin-Turbo',      cyl: 6,  disp: 3.8, hp: 530,  pk: 6250, tq: 2500, red: 7000, w: 225, price: 30000, lvl: 5, safe: 850, fi: { part: 'fi_oem_tt', boost: 15 }, bg: 1.2, bp: 7800 },
  v8_46sc: { name: '4.6L V8 Supercharged (Terminator)', cyl: 8, disp: 4.6, hp: 390, pk: 6000, tq: 3500, red: 6500, w: 270, price: 13800, lvl: 4, safe: 650, fi: { part: 'fi_oem_sc', boost: 12 }, bg: 1.3, bp: 7200, scSound: 'roots' },
  v8_305:  { name: '5.0L Small Block 305',        cyl: 8,  disp: 5.0, hp: 180,  pk: 4000, tq: 2400, red: 5200, w: 250, price: 3800, lvl: 3, safe: 380, bg: 2.2,  bp: 6800 },
  v8_50:   { name: '5.0L V8 Pushrod (302 HO)',    cyl: 8,  disp: 5.0, hp: 225,  pk: 4200, tq: 3200, red: 6250, w: 210, price: 5100, lvl: 2, safe: 450, bg: 2.2,  bp: 7200 },
  v8_50d:  { name: '5.0L V8 DOHC (Coyote)',       cyl: 8,  disp: 5.0, hp: 460,  pk: 7000, tq: 4600, red: 7500, w: 202, price: 18600, lvl: 4, safe: 750, bg: 1.3,  bp: 8000 },
  v8_283:  { name: '4.6L Small Block 283',        cyl: 8,  disp: 4.6, hp: 180,  pk: 4800, tq: 3000, red: 5500, w: 240, price: 4200, lvl: 3, safe: 400, bg: 2.44,  bp: 6800 },
  sbc350:  { name: '5.7L Small Block 350',        cyl: 8,  disp: 5.7, hp: 240,  pk: 4800, tq: 3200, red: 5800, w: 250, price: 6700, lvl: 3, safe: 520, bg: 2.46,  bp: 7000 },
  v8_57tbi:{ name: '5.7L V8 TBI (truck)',         cyl: 8,  disp: 5.7, hp: 210,  pk: 4000, tq: 2800, red: 5000, w: 260, price: 5100, lvl: 3, safe: 450, bg: 2.4,  bp: 6800 },
  v8_57:   { name: '5.7L V8 Pushrod (LS1)',       cyl: 8,  disp: 5.7, hp: 345,  pk: 5600, tq: 4000, red: 6200, w: 207, price: 11100, lvl: 4, safe: 650, bg: 1.55, bp: 7200 },
  v8_62:   { name: '6.2L V8 Pushrod (LS3)',       cyl: 8,  disp: 6.2, hp: 430,  pk: 5900, tq: 4600, red: 6600, w: 210, price: 16500, lvl: 4, safe: 750, bg: 1.45, bp: 7200 },
  v8_70:   { name: '7.0L V8 Pushrod (LS7)',       cyl: 8,  disp: 7.0, hp: 505,  pk: 6300, tq: 4800, red: 7100, w: 208, price: 22000, lvl: 5, safe: 800, bg: 1.3,  bp: 7400 },
  v8_62sc: { name: '6.2L Hemi Supercharged',      cyl: 8,  disp: 6.2, hp: 707,  pk: 6000, tq: 4800, red: 6200, w: 290, price: 40400, lvl: 5, safe: 1000, fi: { part: 'fi_oem_sc', boost: 11.6 }, bg: 1.25, bp: 7000 },
  hemi_70: { name: '7.0L Hemi V8 (426)',          cyl: 8,  disp: 7.0, hp: 350,  pk: 5000, tq: 4000, red: 6000, w: 340, price: 20000, lvl: 5, safe: 800, bg: 1.82,  bp: 7000 },
  bb_74:   { name: '7.4L Big Block V8 (454 LS6)', cyl: 8,  disp: 7.4, hp: 360,  pk: 5600, tq: 3600, red: 6000, w: 310, price: 12900, lvl: 4, safe: 750, bg: 2.00,  bp: 6800 },
  bb_94:   { name: '9.4L Big Block V8 (572)',     cyl: 8,  disp: 9.4, hp: 720,  pk: 6000, tq: 4500, red: 6800, w: 300, price: 41700, lvl: 5, safe: 1400, bg: 1.25, bp: 7200 },
  v10_84:  { name: '8.4L V10',                    cyl: 10, disp: 8.4, hp: 645,  pk: 6200, tq: 5000, red: 6400, w: 290, price: 34200, lvl: 5, safe: 900, bg: 1.25, bp: 7200 },
  v12_65:  { name: '6.5L V12',                    cyl: 12, disp: 6.5, hp: 770,  pk: 8500, tq: 6750, red: 8700, w: 235, price: 60000, lvl: 5, safe: 1000, bg: 1.12, bp: 9000 },
  d_67:    { name: '6.7L I6 Turbo Diesel (Cummins)', cyl: 6, disp: 6.7, hp: 400, pk: 2800, tq: 1600, red: 3200, w: 522, price: 26500, lvl: 5, safe: 1200, fi: { part: 'fi_oem_vgt', boost: 30 }, diesel: true, bg: 1.4, bp: 3600 },
  v8_86b:  { name: '8.6L Billet Pro Mod V8',      cyl: 8,  disp: 8.6, hp: 1250, pk: 7800, tq: 6500, red: 8800, w: 260, price: 120000, lvl: 5, safe: 4500, bg: 1.15, bp: 8600 }
};
Object.keys(DR.ENGINES).forEach(function (k) { DR.ENGINES[k].id = k; });

// ---------------------------------------------------------------------------
// TRANSMISSIONS
//  type: manual | auto | seq | dct     shift: seconds of torque interruption
//  maxTq: input torque the box holds (Nm)  adj: individual ratios adjustable
// ---------------------------------------------------------------------------
DR.TRANS = {
  m5_light: { name: '5-Speed Manual',            type: 'manual', ratios: [3.59, 2.06, 1.36, 1.03, 0.83], shift: 0.38, maxTq: 460,  eff: 0.86, price: 1500 },
  m5_t5_4:  { name: '5-Speed T5 (4-cyl)',        type: 'manual', ratios: [3.97, 2.34, 1.46, 1.00, 0.79], shift: 0.38, maxTq: 380,  eff: 0.86, price: 1200 },
  m5_t5_v6: { name: '5-Speed T5 (V6)',           type: 'manual', ratios: [3.75, 2.19, 1.41, 1.00, 0.72], shift: 0.38, maxTq: 420,  eff: 0.86, price: 1300 },
  m5_t5_v8: { name: '5-Speed T5 World Class (V8)', type: 'manual', ratios: [3.35, 1.93, 1.29, 1.00, 0.68], shift: 0.38, maxTq: 470,  eff: 0.86, price: 1200 },
  m5_hd:    { name: '5-Speed Manual HD',         type: 'manual', ratios: [2.95, 1.94, 1.34, 1.00, 0.73], shift: 0.36, maxTq: 650,  eff: 0.86, price: 2500 },
  m4_cl:    { name: '4-Speed Close Ratio',       type: 'manual', ratios: [2.32, 1.69, 1.29, 1.00],       shift: 0.40, maxTq: 900,  eff: 0.87, price: 2200 },
  m6:       { name: '6-Speed Manual',            type: 'manual', ratios: [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], shift: 0.33, maxTq: 750,  eff: 0.86, price: 3500 },
  m6_hd:    { name: '6-Speed Manual (Built)',    type: 'manual', ratios: [2.97, 2.07, 1.43, 1.00, 0.84, 0.56], shift: 0.30, maxTq: 1300, eff: 0.86, price: 6000 },
  a4:       { name: '4-Speed Automatic',         type: 'auto',   ratios: [3.06, 1.63, 1.00, 0.70],       shift: 0.28, maxTq: 550,  eff: 0.83, price: 1800 },
  a6:       { name: '6-Speed Automatic',         type: 'auto',   ratios: [4.03, 2.36, 1.53, 1.15, 0.85, 0.67], shift: 0.22, maxTq: 800,  eff: 0.84, price: 4000 },
  a8:       { name: '8-Speed Automatic',         type: 'auto',   ratios: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67], shift: 0.14, maxTq: 1100, eff: 0.85, price: 7000 },
  a3_400:   { name: '3-Speed Turbo 400 (Built)', type: 'auto',   ratios: [2.48, 1.48, 1.00],             shift: 0.20, maxTq: 2000, eff: 0.85, price: 3500 },
  pg2:      { name: 'Powerglide 2-Speed',        type: 'auto',   ratios: [1.76, 1.00],                   shift: 0.18, maxTq: 2600, eff: 0.87, price: 4500 },
  a2_pg:    { name: '2-Speed Powerglide',        type: 'auto',   ratios: [1.82, 1.00],                   shift: 0.30, maxTq: 450,  eff: 0.82, price: 900 },
  dct6:     { name: '6-Speed Dual-Clutch',       type: 'dct',    ratios: [4.06, 2.30, 1.60, 1.25, 1.00, 0.80], shift: 0.10, maxTq: 800,  eff: 0.88, price: 10000 },
  dct7:     { name: '7-Speed Dual-Clutch',       type: 'dct',    ratios: [3.36, 2.10, 1.49, 1.13, 0.92, 0.75, 0.63], shift: 0.06, maxTq: 900,  eff: 0.88, price: 12000 },
  seq6:     { name: '6-Speed Sequential',        type: 'seq',    ratios: [2.90, 2.00, 1.50, 1.20, 1.00, 0.86], shift: 0.08, maxTq: 1500, eff: 0.90, price: 14000, adj: true },
  // Transaxles: gearbox and differential in one case, for an engine that
  // sits sideways (front-drive, and AWD cars built from them). Smaller
  // gears and a diff in the case: they hold less than a rear-drive box.
  tx5:      { name: '5-Speed Manual Transaxle',  type: 'manual', ratios: [3.25, 1.90, 1.27, 0.94, 0.76], shift: 0.38, maxTq: 400,  eff: 0.86, price: 1200, mount: 'T' },
  tx5_hd:   { name: 'HD 5-Speed Transaxle',      type: 'manual', ratios: [3.38, 1.76, 1.18, 0.89, 0.71], shift: 0.37, maxTq: 600,  eff: 0.86, price: 2500, mount: 'T' },
  tx6:      { name: '6-Speed Manual Transaxle',  type: 'manual', ratios: [3.36, 2.09, 1.47, 1.10, 0.89, 0.73], shift: 0.35, maxTq: 550, eff: 0.86, price: 3500, mount: 'T' },
  tx6_hd:   { name: '6-Speed Transaxle (Built, Straight-Cut)', type: 'manual', ratios: [2.92, 2.05, 1.52, 1.17, 0.94, 0.78], shift: 0.30, maxTq: 1000, eff: 0.86, price: 6500, mount: 'T' },
  tx4a:     { name: '4-Speed Automatic Transaxle', type: 'auto', ratios: [2.92, 1.57, 1.00, 0.71],   shift: 0.28, maxTq: 450,  eff: 0.82, price: 1800, mount: 'T' },
  txdct:    { name: '6-Speed DSG Transaxle',     type: 'dct',    ratios: [3.46, 2.05, 1.30, 0.90, 0.91, 0.76], shift: 0.10, maxTq: 700, eff: 0.88, price: 9000, mount: 'T' },
  txseq:    { name: '6-Speed Sequential Transaxle', type: 'seq', ratios: [2.92, 2.05, 1.58, 1.26, 1.04, 0.88], shift: 0.08, maxTq: 1200, eff: 0.90, price: 15000, adj: true, mount: 'T' },
  lenco5:   { name: 'Lenco 5-Speed Air-Shift',   type: 'seq',    ratios: [2.39, 1.69, 1.31, 1.12, 1.00], shift: 0.04, maxTq: 4500, eff: 0.91, price: 30000, adj: true }
};
DR.TRANS_SHOP = ['m5_t5_v8', 'm5_hd', 'm4_cl', 'm6', 'm6_hd', 'a4', 'a6', 'a8', 'a3_400', 'pg2', 'dct7', 'seq6', 'lenco5',
  'tx5', 'tx5_hd', 'tx6', 'tx6_hd', 'tx4a', 'txdct', 'txseq'];

// ---------------------------------------------------------------------------
// TIRES (driven axle)
//  mu: peak friction on a prepped strip   optP: ideal pressure psi
//  slip: slip ratio at peak grip          fall: grip lost when spinning hard
//  fk: how fast grip falls away past the peak (slip ratio for ~63% of fall;
//      street tires fade gently like the textbook dry-tarmac curve, drag
//      radials are 'hook or spin')
//  r: rolling radius m   m: rotating mass kg (pair)
//  topt: ideal temp C    cold: grip lost when stone cold
// ---------------------------------------------------------------------------
DR.TIRES = {
  st_195: { name: 'Economy 195/60R15',         kind: 'Street',     mu: 1.25, optP: 32, slip: 0.11, fall: 0.20, fk: 1.2, r: 0.300, m: 18, topt: 45, cold: 0.03, price: 300 },
  st_225: { name: 'Sport 225/45R17',           kind: 'Street',     mu: 1.35, optP: 32, slip: 0.11, fall: 0.20, fk: 1.2, r: 0.317, m: 20, topt: 50, cold: 0.04, price: 500 },
  st_255: { name: 'Performance 255/40R18',     kind: 'Street',     mu: 1.42, optP: 32, slip: 0.12, fall: 0.20, fk: 1.2, r: 0.330, m: 22, topt: 55, cold: 0.05, price: 800 },
  st_305: { name: 'Performance 305/30R20',     kind: 'Street',     mu: 1.48, optP: 32, slip: 0.12, fall: 0.20, fk: 1.2, r: 0.346, m: 26, topt: 55, cold: 0.06, price: 1100 },
  dr_245: { name: 'Budget Drag Radial 245/50R16', kind: 'Drag Radial',mu: 1.65, optP: 20, slip: 0.13, fall: 0.25, fk: 0.75, r: 0.317, m: 22, topt: 55, cold: 0.12, price: 650 },
  dr_275: { name: 'Drag Radial 275/40R17',     kind: 'Drag Radial',mu: 1.85, optP: 18, slip: 0.13, fall: 0.26, fk: 0.7, r: 0.330, m: 24, topt: 60, cold: 0.15, price: 900 },
  dr_315: { name: 'Drag Radial 315/60R15',     kind: 'Drag Radial',mu: 2.10, optP: 17, slip: 0.13, fall: 0.26, fk: 0.7, r: 0.345, m: 26, topt: 60, cold: 0.16, price: 1300, lvl: 3 },
  ets_28: { name: 'ET Street Slick 28x10.5',   kind: 'Slick',      mu: 2.40, optP: 14, slip: 0.15, fall: 0.28, fk: 0.9, r: 0.356, m: 24, topt: 70, cold: 0.24, price: 1600, lvl: 3 },
  sl_31:  { name: 'Drag Slick 31x13',          kind: 'Slick',      mu: 2.80, optP: 11, slip: 0.17, fall: 0.30, fk: 1.0, r: 0.394, m: 28, topt: 75, cold: 0.28, price: 2600, lvl: 4 },
  sl_33:  { name: 'Drag Slick 33x16',          kind: 'Slick',      mu: 3.20, optP: 9,  slip: 0.18, fall: 0.32, fk: 1.0, r: 0.419, m: 32, topt: 78, cold: 0.30, price: 4200, lvl: 4 },
  sl_36:  { name: 'Pro Slick 36x17',           kind: 'Slick',      mu: 3.60, optP: 7,  slip: 0.19, fall: 0.32, fk: 1.0, r: 0.457, m: 38, topt: 80, cold: 0.32, price: 7500, lvl: 5 }
};
DR.TIRE_SHOP = ['st_195', 'st_225', 'st_255', 'st_305', 'dr_245', 'dr_275', 'dr_315', 'ets_28', 'sl_31', 'sl_33', 'sl_36'];

// ---------------------------------------------------------------------------
// VEHICLES
//  cat: dealer category   body: sprite profile   m: curb mass incl. driver
//  f: front weight fraction   wb: wheelbase   len: length   h: CG height
//  cda: drag area m^2   drive: RWD|FWD|AWD   ep: engine position
//  diff: stock differential   col: default paint
//  trans / fd / gears: the factory box, final drive and its own ratios
//  (used while the factory box is fitted; a swapped box brings its own)
//  name: real make/model for now (to be de-branded later); alias: the
//  earlier made-up name. real: the exact model and generation the sprite
//  should be drawn from. Cars with an entry in DR.CAR_ART (cars.js) have art
//  traced from a reference shot; every other car uses the generic profile
//  for its body type until it gets one.
// ---------------------------------------------------------------------------
DR.CARS = {
  // ---- Muscle ----------------------------------------------------------------
  fox:      { name: 'Ford Mustang GT \'89', alias: 'Fox Stallion \'89', real: '1987-93 Ford Mustang GT hatchback (Fox body)',    cat: 'Muscle',  body: 'hatch',    price: 7000,  m: 1460, f: 0.56, wb: 2.55, len: 4.6, h: 0.53, cda: 0.74, drive: 'RWD', ep: 'front', engine: 'v8_50',  trans: 'm5_light', fd: 2.73, gears: [3.35, 1.93, 1.29, 1, 0.68], tire: 'st_225', diff: 'lsd',  col: '#c01515' },
  fox23:    { name: 'Ford Mustang LX 2.3 \'89', alias: 'Fox Stallion LX', real: '1987-93 Ford Mustang LX hatchback, 2.3 four-cylinder (Fox body)', art: 'fox', cat: 'Muscle', body: 'hatch', price: 2500, m: 1330, f: 0.53, wb: 2.55, len: 4.6, h: 0.53, cda: 0.74, drive: 'RWD', ep: 'front', engine: 'i4_23', trans: 'm5_t5_4', fd: 3.45, tire: 'st_195', diff: 'open', col: '#2b3f8c' },
  camaro6:  { name: 'Chevrolet Camaro V6 \'98', alias: 'Camero V6 \'98', real: '1998-02 Chevrolet Camaro coupe, 3.8 V6 (4th gen)', cat: 'Muscle', body: 'sports', price: 5000, m: 1560, f: 0.55, wb: 2.57, len: 4.9, h: 0.50, cda: 0.70, drive: 'RWD', ep: 'front', engine: 'v6_38', trans: 'm5_t5_v6', fd: 3.23, tire: 'st_225', diff: 'open', col: '#c0c4cc' },
  camss:    { name: 'Chevrolet Camaro SS \'12', alias: 'Camero SS \'12', real: '2010-15 Chevrolet Camaro SS coupe (5th gen)',       cat: 'Muscle',  body: 'modern',   price: 36000, m: 1830, f: 0.52, wb: 2.81, len: 4.8, h: 0.51, cda: 0.74, drive: 'RWD', ep: 'front', engine: 'v8_62',  trans: 'a6',       fd: 3.27, tire: 'st_255', diff: 'lsd',  col: '#ffb300' },
  // ---- JDM -------------------------------------------------------------------
  hachi:    { name: 'Toyota AE86 Trueno', alias: 'Hachi Coupe', real: '1983-87 Toyota Sprinter Trueno GT-Apex hatch (AE86)',          cat: 'JDM',  body: 'hatch',    price: 6000,  m: 1020,  f: 0.53, wb: 2.40, len: 4.2, h: 0.50, cda: 0.60, drive: 'RWD', ep: 'front', engine: 'i4_16',  trans: 'm5_light', fd: 4.3, gears: [3.587, 2.022, 1.384, 1, 0.861], tire: 'st_195', diff: 'lsd',  col: '#f4f4f4' },
  supra:    { name: 'Toyota Supra Turbo', alias: 'Supremo Mk4', real: '1993-98 Toyota Supra Turbo (A80 / Mk4)',          cat: 'JDM',  body: 'sports',   price: 45000, m: 1630, f: 0.53, wb: 2.55, len: 4.7, h: 0.48, cda: 0.62, drive: 'RWD', ep: 'front', engine: 'i6_30tt',trans: 'm6',       fd: 3.266, gears: [3.827, 2.36, 1.685, 1.312, 1, 0.793], tire: 'st_255', diff: 'lsd',  col: '#ff7a00' },
  // ---- Starters / compacts -------------------------------------------------
  ronin:    { name: 'Honda Civic Hatch', alias: 'Ronin Hatch', real: '1992-95 Honda Civic hatchback (EG)',          cat: 'Compact', body: 'hatch',    price: 3000,  m: 1050, f: 0.62, wb: 2.57, len: 4.0, h: 0.52, cda: 0.62, drive: 'FWD', ep: 'front', engine: 'i4_15',  trans: 'm5_light', fd: 4.058, gears: [3.25, 1.782, 1.208, 0.911, 0.75], tire: 'st_195', diff: 'open', col: '#d23a3a' },
  bolt:     { name: 'Dodge Neon R/T', alias: 'Bolt SX', real: '2001-02 Dodge Neon R/T sedan (2nd gen)',              cat: 'Compact', body: 'sedan',    price: 3500,  m: 1260, f: 0.62, wb: 2.64, len: 4.4, h: 0.53, cda: 0.66, drive: 'FWD', ep: 'front', engine: 'i4_20',  trans: 'm5_light', fd: 3.94, gears: [3.54, 2.13, 1.36, 1.03, 0.81], tire: 'st_195', diff: 'open', col: '#3a7bd2' },
  pip:      { name: 'Geo Metro', alias: 'Pip Micro', real: '1989-94 Geo Metro 3-door hatch (1.0 3-cyl)',            cat: 'Compact', body: 'hatch',    price: 1500,  m: 840,  f: 0.63, wb: 2.37, len: 3.6, h: 0.50, cda: 0.58, drive: 'FWD', ep: 'front', engine: 'i3_10',  trans: 'm5_light', fd: 4.39, gears: [3.416, 1.95, 1.28, 0.966, 0.757], tire: 'st_195', diff: 'open', col: '#e8c547' },
  kaze:     { name: 'Acura Integra Type R', alias: 'Kaze Type-R', real: '1997-01 Acura Integra Type R liftback (DC2)',          cat: 'Compact', body: 'hatch',    price: 11000, m: 1280, f: 0.62, wb: 2.57, len: 4.3, h: 0.50, cda: 0.62, drive: 'FWD', ep: 'front', engine: 'i4_18',  trans: 'm5_light', fd: 4.4, gears: [3.23, 2.105, 1.458, 1.107, 0.848], tire: 'st_225', diff: 'lsd',  col: '#f2f2f2' },
  volta:    { name: 'Volkswagen Golf GTI', alias: 'Volta GTi', real: '2006-09 Volkswagen Golf GTI 3-door (Mk5)',            cat: 'Compact', body: 'hatch',    price: 9000,  m: 1490, f: 0.61, wb: 2.58, len: 4.2, h: 0.52, cda: 0.65, drive: 'FWD', ep: 'front', engine: 'i4_20t', trans: 'm6',       fd: 3.65, gears: [3.36, 2.09, 1.47, 1.1, 0.89, 0.73], tire: 'st_225', diff: 'open', col: '#2a2a2a' },
  cobaltss: { name: 'Chevrolet Cobalt SS', alias: 'Cobra SS Compact', real: '2008-10 Chevrolet Cobalt SS Turbocharged coupe',     cat: 'Compact', body: 'coupe',    price: 10000, m: 1440, f: 0.62, wb: 2.62, len: 4.6, h: 0.52, cda: 0.64, drive: 'FWD', ep: 'front', engine: 'i4_20t', trans: 'm5_hd',    fd: 3.94, gears: [3.38, 1.76, 1.18, 0.89, 0.71], tire: 'st_225', diff: 'lsd',  col: '#f0a020' },
  beetle:   { name: 'Volkswagen Beetle', alias: 'Bug Classic', real: '1967-77 Volkswagen Beetle (Type 1)',          cat: 'Classic', body: 'beetle',   price: 2500,  m: 900,  f: 0.40, wb: 2.40, len: 4.1, h: 0.55, cda: 0.80, drive: 'RWD', ep: 'rear',  engine: 'f4_16',  trans: 'm4_cl',    fd: 4.375, gears: [3.8, 2.06, 1.26, 0.89], tire: 'st_195', diff: 'open', col: '#7ec8e3' },
  // ---- JDM -------------------------------------------------------------------
  mira:     { name: 'Mazda MX-5 Miata', alias: 'Mira Roadster', real: '1989-97 Mazda MX-5 Miata (NA)',        cat: 'JDM',     body: 'roadster', price: 7500,  m: 1020, f: 0.51, wb: 2.27, len: 3.9, h: 0.46, cda: 0.58, drive: 'RWD', ep: 'front', engine: 'i4_16',  trans: 'm5_light', fd: 4.3, gears: [3.136, 1.888, 1.33, 1, 0.814], tire: 'st_195', diff: 'lsd',  col: '#c81e1e' },
  silvia:   { name: 'Nissan Silvia S14', alias: 'Sylph S14', real: '1995-98 Nissan Silvia / 240SX coupe (S14)',            cat: 'JDM',     body: 'coupe',    price: 12000, m: 1330, f: 0.56, wb: 2.53, len: 4.5, h: 0.50, cda: 0.62, drive: 'RWD', ep: 'front', engine: 'i4_20t', trans: 'm5_light', fd: 4.083, gears: [3.321, 1.902, 1.308, 1, 0.759], tire: 'st_225', diff: 'lsd',  col: '#9aa8b4' },
  s2k:      { name: 'Honda S2000', alias: 'Ess-2K Roadster', real: '1999-03 Honda S2000 (AP1)',      cat: 'JDM',     body: 'roadster', price: 21000, m: 1355, f: 0.50, wb: 2.40, len: 4.1, h: 0.46, cda: 0.62, drive: 'RWD', ep: 'front', engine: 'i4_20hi',trans: 'm6',       fd: 4.1, gears: [3.133, 2.045, 1.481, 1.161, 0.97, 0.81], tire: 'st_225', diff: 'lsd',  col: '#ffcc00' },
  rx7:      { name: 'Mazda RX-7 FD', alias: 'Rotor-7 FD', real: '1992-02 Mazda RX-7 (FD3S)',           cat: 'JDM',     body: 'sports',   price: 30000, m: 1350, f: 0.50, wb: 2.43, len: 4.3, h: 0.45, cda: 0.58, drive: 'RWD', ep: 'front', engine: 'rot_13t',trans: 'm5_light', fd: 4.1, gears: [3.483, 2.015, 1.391, 1, 0.762], tire: 'st_255', diff: 'lsd',  col: '#d01818' },
  evo:      { name: 'Mitsubishi Lancer Evo IX', alias: 'Lancer EV-9', real: '2005-07 Mitsubishi Lancer Evolution IX sedan',          cat: 'JDM',     body: 'sedan',    price: 24000, m: 1570, f: 0.60, wb: 2.63, len: 4.5, h: 0.52, cda: 0.70, drive: 'AWD', ep: 'front', engine: 'i4_20tev', trans: 'm5_hd',    fd: 4.529, gears: [2.928, 1.95, 1.407, 1.031, 0.72], tire: 'st_225', diff: 'lsd',  col: '#f6f6f6' },
  sti:      { name: 'Subaru WRX STI', alias: 'Pleiades WRX', real: '2004-07 Subaru Impreza WRX STI sedan (GD)',         cat: 'JDM',     body: 'sedan',    price: 22000, m: 1580, f: 0.59, wb: 2.63, len: 4.5, h: 0.53, cda: 0.70, drive: 'AWD', ep: 'front', engine: 'f4_25t', trans: 'm6',       fd: 3.9, gears: [3.636, 2.375, 1.761, 1.346, 0.971, 0.756], tire: 'st_225', diff: 'lsd',  col: '#1d3f9a' },
  r34:      { name: 'Nissan Skyline GT-R R34', alias: 'Skyrunner R34', real: '1999-02 Nissan Skyline GT-R coupe (BNR34)',        cat: 'JDM',     body: 'coupe',    price: 55000, m: 1640, f: 0.56, wb: 2.66, len: 4.6, h: 0.50, cda: 0.66, drive: 'AWD', ep: 'front', engine: 'i6_26tt',trans: 'm6',       fd: 3.545, gears: [3.827, 2.36, 1.685, 1.312, 1, 0.793], tire: 'st_255', diff: 'lsd',  col: '#3757a8' },
  z35:      { name: 'Nissan 350Z', alias: 'Zed 350', real: '2003-08 Nissan 350Z coupe (Z33)',              cat: 'JDM',     body: 'sports',   price: 14000, m: 1500, f: 0.53, wb: 2.65, len: 4.3, h: 0.49, cda: 0.64, drive: 'RWD', ep: 'front', engine: 'v6_35',  trans: 'm6',       fd: 3.538, gears: [3.794, 2.324, 1.624, 1.271, 1, 0.794], tire: 'st_255', diff: 'lsd',  col: '#b0b0b0' },
  gtr:      { name: 'Nissan GT-R R35', alias: 'Godzilla R35', real: '2009-16 Nissan GT-R (R35)',         cat: 'JDM',     body: 'coupe',    price: 95000, m: 1820, f: 0.54, wb: 2.78, len: 4.7, h: 0.50, cda: 0.68, drive: 'AWD', ep: 'front', engine: 'v6_38tt',trans: 'dct6',     fd: 3.7, gears: [4.056, 2.301, 1.595, 1.248, 1.001, 0.796], tire: 'st_255', diff: 'lsd',  col: '#d8d8d8' },
  // ---- Euro ------------------------------------------------------------------
  m3:       { name: 'BMW M3 E46', alias: 'Bayern M3 E46', real: '2001-06 BMW M3 coupe (E46)',        cat: 'Euro',    body: 'coupe',    price: 20000, m: 1630, f: 0.51, wb: 2.73, len: 4.5, h: 0.49, cda: 0.66, drive: 'RWD', ep: 'front', engine: 'i6_32',  trans: 'm6',       fd: 3.62, gears: [4.23, 2.53, 1.67, 1.23, 1, 0.83], tire: 'st_255', diff: 'lsd',  col: '#2c4c8c' },
  p911:     { name: 'Porsche 911 Turbo', alias: 'Stuttgart 9T Turbo', real: '2007-12 Porsche 911 Turbo coupe (997)',   cat: 'Euro',    body: 'sports',   price: 140000,m: 1640, f: 0.39, wb: 2.45, len: 4.5, h: 0.47, cda: 0.62, drive: 'AWD', ep: 'rear',  engine: 'f6_38tt',trans: 'dct7',     fd: 3.44, gears: [3.91, 2.29, 1.58, 1.18, 0.94, 0.79, 0.62], tire: 'st_305', diff: 'lsd',  col: '#e0d6b8' },
  lambo:    { name: 'Lamborghini Aventador SVJ', alias: 'Toro V12 Ultimo', real: '2018-22 Lamborghini Aventador SVJ',      cat: 'Euro',    body: 'supercar', price: 380000,m: 1830, f: 0.43, wb: 2.70, len: 4.8, h: 0.44, cda: 0.65, drive: 'AWD', ep: 'mid',   engine: 'v12_65', trans: 'dct7',     fd: 3.20, tire: 'st_305', diff: 'lsd',  col: '#7cd320' },
  // ---- Classic muscle -------------------------------------------------------
  nova:     { name: 'Chevrolet Nova SS \'68', alias: 'Nova-Star \'68', real: '1968-72 Chevrolet Nova SS coupe',       cat: 'Classic', body: 'muscle',   price: 16000, m: 1500, f: 0.55, wb: 2.82, len: 4.8, h: 0.54, cda: 0.80, drive: 'RWD', ep: 'front', engine: 'sbc350',  trans: 'a4',       fd: 3.08, tire: 'st_225', diff: 'open', col: '#2e7d4f' },
  chevelle: { name: 'Chevrolet Chevelle SS \'70', alias: 'Chevalier SS \'70', real: '1970 Chevrolet Chevelle SS 454 coupe',    cat: 'Classic', body: 'muscle',   price: 38000, m: 1800, f: 0.56, wb: 2.84, len: 5.0, h: 0.55, cda: 0.85, drive: 'RWD', ep: 'front', engine: 'bb_74',  trans: 'm4_cl',    fd: 3.55, gears: [2.2, 1.64, 1.28, 1], tire: 'st_225', diff: 'lsd',  col: '#151515' },
  charger:  { name: 'Dodge Charger R/T \'69', alias: 'Chargemaster \'69', real: '1969 Dodge Charger R/T',    cat: 'Classic', body: 'muscle',   price: 55000, m: 1790, f: 0.56, wb: 2.97, len: 5.3, h: 0.55, cda: 0.88, drive: 'RWD', ep: 'front', engine: 'hemi_70',trans: 'a3_400',   fd: 3.55, gears: [2.45, 1.45, 1], tire: 'st_225', diff: 'lsd',  col: '#b31b1b' },
  cuda:     { name: 'Plymouth Hemi \'Cuda \'70', alias: 'Barracudo \'70', real: '1970-71 Plymouth Hemi \'Cuda',       cat: 'Classic', body: 'muscle',   price: 62000, m: 1780, f: 0.56, wb: 2.75, len: 4.8, h: 0.54, cda: 0.84, drive: 'RWD', ep: 'front', engine: 'hemi_70',trans: 'm4_cl',    fd: 3.54, gears: [2.44, 1.77, 1.34, 1], tire: 'st_225', diff: 'lsd',  col: '#ff6a00' },
  belair:   { name: 'Chevrolet Bel Air \'57', alias: 'Bel-Aire \'57', real: '1957 Chevrolet Bel Air 2-door hardtop',        cat: 'Classic', body: 'classic',  price: 21000, m: 1620, f: 0.55, wb: 2.92, len: 5.0, h: 0.58, cda: 0.92, drive: 'RWD', ep: 'front', engine: 'v8_283',  trans: 'a2_pg',    fd: 3.55, tire: 'st_195', diff: 'open', col: '#2fb3a8' },
  willys:   { name: 'Willys Gasser \'41', alias: 'Willis Gasser \'41', real: '1941 Willys coupe, gasser build (nose-up straight axle)',   cat: 'Classic', body: 'gasser',   price: 28000, m: 1180, f: 0.52, wb: 2.64, len: 4.3, h: 0.66, cda: 0.88, drive: 'RWD', ep: 'front', engine: 'sbc350',  trans: 'm4_cl',    fd: 4.11, tire: 'st_225', diff: 'lsd',  col: '#efe14b' },
  monte:    { name: 'Chevrolet Monte Carlo SS \'87', alias: 'Monte Carla SS \'87', real: '1983-88 Chevrolet Monte Carlo SS',  cat: 'Classic', body: 'sedan',    price: 8000,  m: 1645, f: 0.56, wb: 2.75, len: 5.1, h: 0.55, cda: 0.80, drive: 'RWD', ep: 'front', engine: 'v8_305',  trans: 'a4',       fd: 3.73, gears: [2.74, 1.57, 1, 0.67], tire: 'st_195', diff: 'open', col: '#5a5a5a' },
  gnx:      { name: 'Buick GNX \'87', alias: 'Grand Nation GNX', real: '1987 Buick GNX (Grand National)',     cat: 'Classic', body: 'sedan',    price: 32000, m: 1690, f: 0.57, wb: 2.75, len: 5.0, h: 0.55, cda: 0.80, drive: 'RWD', ep: 'front', engine: 'v6_38gnx', trans: 'a4',       fd: 3.42, gears: [2.74, 1.57, 1, 0.67], tire: 'st_225', diff: 'lsd',  col: '#0d0d0d' },
  // ---- Modern muscle ----------------------------------------------------------
  camaro:   { name: 'Chevrolet Camaro Z28 \'98', alias: 'Camero Z \'98', real: '1998-02 Chevrolet Camaro Z28 (4th gen)',        cat: 'Muscle',  body: 'sports',   price: 12000, m: 1645, f: 0.56, wb: 2.57, len: 4.9, h: 0.50, cda: 0.70, drive: 'RWD', ep: 'front', engine: 'v8_57',  trans: 'm6',       fd: 3.42, gears: [2.66, 1.78, 1.3, 1, 0.74, 0.5], tire: 'st_255', diff: 'lsd',  col: '#244fa8' },
  cobra03:  { name: 'Ford Mustang SVT Cobra \'03', alias: 'Stallion Cobra \'03', real: '2003-04 Ford Mustang SVT Cobra \'Terminator\' (SN95)',  cat: 'Muscle',  body: 'coupe',    price: 22000, m: 1745, f: 0.57, wb: 2.57, len: 4.6, h: 0.52, cda: 0.74, drive: 'RWD', ep: 'front', engine: 'v8_46sc',trans: 'm6',       fd: 3.55, tire: 'st_255', diff: 'lsd',  col: '#8a8f99' },
  stang15:  { name: 'Ford Mustang GT \'18', alias: 'Stallion GT \'18', real: '2018-23 Ford Mustang GT fastback (S550)',     cat: 'Muscle',  body: 'modern',   price: 32000, m: 1730, f: 0.53, wb: 2.72, len: 4.8, h: 0.52, cda: 0.74, drive: 'RWD', ep: 'front', engine: 'v8_50d', trans: 'm6',       fd: 3.73, gears: [3.66, 2.43, 1.69, 1.32, 1, 0.65], tire: 'st_255', diff: 'lsd',  col: '#1c5bd6' },
  vette5:   { name: 'Chevrolet Corvette C5', alias: 'Corsa C5', real: '1997-04 Chevrolet Corvette coupe (C5)',             cat: 'Muscle',  body: 'sports',   price: 21000, m: 1555, f: 0.51, wb: 2.65, len: 4.6, h: 0.47, cda: 0.62, drive: 'RWD', ep: 'front', engine: 'v8_57',  trans: 'm6',       fd: 3.42, gears: [2.66, 1.78, 1.3, 1, 0.74, 0.5], tire: 'st_255', diff: 'lsd',  col: '#ffd200' },
  z06:      { name: 'Chevrolet Corvette Z06', alias: 'Corsa Z06', real: '2006-13 Chevrolet Corvette Z06 (C6)',            cat: 'Muscle',  body: 'sports',   price: 60000, m: 1500, f: 0.51, wb: 2.69, len: 4.5, h: 0.47, cda: 0.62, drive: 'RWD', ep: 'front', engine: 'v8_70',  trans: 'm6',       fd: 3.42, gears: [2.66, 1.78, 1.3, 1, 0.74, 0.5], tire: 'st_305', diff: 'lsd',  col: '#e6e6e6' },
  hellcat:  { name: 'Dodge Challenger Hellcat', alias: 'Hellhound SRT', real: '2015-23 Dodge Challenger SRT Hellcat',        cat: 'Muscle',  body: 'modern',   price: 68000, m: 2100, f: 0.56, wb: 2.95, len: 5.0, h: 0.54, cda: 0.80, drive: 'RWD', ep: 'front', engine: 'v8_62sc',trans: 'a8',       fd: 2.62, tire: 'st_305', diff: 'lsd',  col: '#4b1a6e' },
  viper:    { name: 'Dodge Viper ACR', alias: 'Serpent ACR', real: '2016-17 Dodge Viper ACR (VX)',          cat: 'Muscle',  body: 'supercar', price: 110000,m: 1610, f: 0.50, wb: 2.51, len: 4.5, h: 0.45, cda: 0.66, drive: 'RWD', ep: 'front', engine: 'v10_84', trans: 'm6',       fd: 3.55, gears: [2.26, 1.58, 1.19, 1, 0.77, 0.63], tire: 'st_305', diff: 'lsd',  col: '#c8102e' },
  // ---- Trucks -----------------------------------------------------------------
  hauler:   { name: 'Chevrolet C1500', alias: 'Workhorse 1500', real: '1988-98 Chevrolet C1500 regular cab (GMT400)',       cat: 'Truck',   body: 'truck',    price: 9000,  m: 2150, f: 0.57, wb: 3.58, len: 5.8, h: 0.68, cda: 1.15, drive: 'RWD', ep: 'front', engine: 'v8_57tbi',  trans: 'a4',       fd: 3.42, tire: 'st_255', diff: 'open', col: '#2b4d2b' },
  lightning:{ name: 'Ford F-150 Lightning', alias: 'Lightning SVX', real: '1999-04 Ford F-150 SVT Lightning',        cat: 'Truck',   body: 'truck',    price: 26000, m: 2200, f: 0.57, wb: 3.06, len: 5.3, h: 0.65, cda: 1.05, drive: 'RWD', ep: 'front', engine: 'v8_46sc',trans: 'a4',       fd: 3.55, gears: [2.71, 1.54, 1, 0.71], tire: 'st_305', diff: 'lsd',  col: '#d4d4d4' },
  diesel:   { name: 'Ram 2500 Cummins', alias: 'Heavy Duty 2500 Diesel', real: '2010-18 Ram 2500 Cummins 6.7 crew cab',cat: 'Truck',  body: 'truck',    price: 48000, m: 3300, f: 0.60, wb: 3.80, len: 6.1, h: 0.75, cda: 1.30, drive: 'AWD', ep: 'front', engine: 'd_67',   trans: 'a6',       fd: 3.42, gears: [3.23, 1.84, 1.41, 1, 0.82, 0.63], tire: 'st_305', diff: 'lsd',  col: '#8b0000' },
  // ---- Pro / Race ---------------------------------------------------------------
  promod:   { name: 'Pro Mod Camaro', alias: 'Pro Mod Camero', real: 'Pro Mod Camaro (tube-chassis drag car, Camaro body)',       cat: 'Pro',     body: 'promod',   price: 210000,m: 1180, f: 0.48, wb: 2.67, len: 4.9, h: 0.46, cda: 0.62, drive: 'RWD', ep: 'front', engine: 'v8_86b', trans: 'lenco5',   fd: 3.20, tire: 'sl_33',  diff: 'spool',col: '#e31b6d' },
  rail:     { name: 'Top Dragster', alias: 'Rail Dragster', real: 'Rear-engine Top Dragster / Top Alcohol rail',        cat: 'Pro',     body: 'dragster', price: 320000,m: 900,  f: 0.25, wb: 6.4,  len: 8.0, h: 0.42, cda: 0.50, drive: 'RWD', ep: 'mid',   engine: 'bb_94',  trans: 'pg2',      fd: 3.70, tire: 'sl_36',  diff: 'spool',col: '#ffde00' }
};
// Engine packaging for swaps: [size, mount]. size 1 (three-cylinder,
// rotary) .. 5 (big-block, DOHC V8, V10/V12, Cummins); mount is how the
// engine was built to sit: T transverse, L longitudinal, B both (the
// block came both ways from the factory).
DR.ENGINE_FIT = {
  i3_10: [1, 'T'], f4_16: [1, 'L'], rot_13t: [1, 'L'],
  i4_15: [2, 'T'], i4_18: [2, 'T'], i4_20: [2, 'T'], i4_20k: [2, 'T'], i4_20t3s: [2, 'T'],
  i4_16: [2, 'B'], i4_16sc: [2, 'B'], i4_16b: [2, 'B'], i4_20t: [2, 'B'], i4_20tev: [2, 'B'],
  i4_23: [2, 'L'], i4_23t: [2, 'L'], i4_20hi: [2, 'L'], f4_25t: [2, 'L'],
  v6_38: [3, 'B'], v6_38sc: [3, 'B'], v6_35: [3, 'B'],
  v6_38t: [3, 'L'], v6_38gnx: [3, 'L'], v6_38tt: [3, 'L'], f6_38tt: [3, 'L'],
  i6_30: [3, 'L'], i6_30tt: [3, 'L'], i6_26tt: [3, 'L'], i6_32: [3, 'L'],
  v8_305: [4, 'L'], v8_283: [4, 'L'], sbc350: [4, 'L'], v8_57tbi: [4, 'L'], v8_50: [4, 'L'], v8_57: [4, 'L'], v8_62: [4, 'L'], v8_70: [4, 'L'],
  v8_46sc: [5, 'L'], v8_50d: [5, 'L'], hemi_70: [5, 'L'], bb_74: [5, 'L'], bb_94: [5, 'L'], v8_62sc: [5, 'L'], v10_84: [5, 'L'], v12_65: [5, 'L'], d_67: [5, 'L'], v8_86b: [5, 'L']
};
Object.keys(DR.ENGINE_FIT).forEach(function (id) { DR.ENGINES[id].size = DR.ENGINE_FIT[id][0]; DR.ENGINES[id].mount = DR.ENGINE_FIT[id][1]; });
// Engine bays and shells: [bay size, mount, shell]. The bay takes engines up
// to its size without cutting metal; shell is the power (hp, nitrous
// included) the stock body takes before it starts to twist and crack.
// Pro cars are tube chassis.
DR.CAR_FIT = {
  pip: [1, 'T', 250], ronin: [2, 'T', 300], bolt: [2, 'T', 350], kaze: [2, 'T', 350], volta: [3, 'T', 450], cobaltss: [3, 'T', 450], evo: [2, 'T', 500],
  beetle: [2, 'L', 250], hachi: [2, 'L', 300], mira: [2, 'L', 300], s2k: [2, 'L', 450], sti: [2, 'L', 500],
  silvia: [3, 'L', 400], rx7: [3, 'L', 450], m3: [3, 'L', 500], r34: [3, 'L', 550], p911: [3, 'L', 700],
  fox: [4, 'L', 400], fox23: [4, 'L', 400], camaro6: [4, 'L', 450], camaro: [4, 'L', 450], supra: [4, 'L', 550], z35: [4, 'L', 500], gtr: [4, 'L', 700],
  gnx: [4, 'L', 500], belair: [4, 'L', 600], vette5: [4, 'L', 600], z06: [4, 'L', 650],
  nova: [5, 'L', 450], chevelle: [5, 'L', 600], charger: [5, 'L', 550], cuda: [5, 'L', 550], willys: [5, 'L', 600], monte: [5, 'L', 550],
  camss: [5, 'L', 650], stang15: [5, 'L', 650], cobra03: [5, 'L', 500], hellcat: [5, 'L', 750], viper: [5, 'L', 800], lambo: [5, 'L', 900],
  hauler: [5, 'L', 800], lightning: [5, 'L', 850], diesel: [5, 'L', 1500], promod: [5, 'L', 0], rail: [5, 'L', 0]
};
Object.keys(DR.CAR_FIT).forEach(function (id) { var c = DR.CARS[id], f = DR.CAR_FIT[id]; c.bay = f[0]; c.mount = f[1]; c.shell = f[2] || Infinity; });
// A transverse car's factory gearbox is a transaxle; when one is converted
// to rear or all-wheel drive it gets the matching rear-drive box.
DR.TX_FOR = { m5_light: 'tx5', m5_hd: 'tx5_hd', m6: 'tx6' };
DR.TX_REAR = { tx5: 'm5_light', tx5_hd: 'm5_hd', tx6: 'm6' };
Object.keys(DR.CARS).forEach(function (id) { var c = DR.CARS[id]; if (c.mount === 'T' && DR.TX_FOR[c.trans]) c.trans = DR.TX_FOR[c.trans]; });
// Dealer tabs, in rail order.
DR.CAR_CATS =['Compact', 'JDM', 'Euro', 'Muscle', 'Classic', 'Truck', 'Pro'];
// Kept so code that still looks here resolves.
DR.CARS_RESERVE = {};


// Paint palette for the paint shop
DR.PAINTS = ['#d23a3a', '#c8102e', '#ff6a00', '#f0a020', '#ffcc00', '#efe14b', '#7cd320', '#2e7d4f', '#2fb3a8',
  '#7ec8e3', '#3a7bd2', '#1c3f9a', '#4b1a6e', '#a24bd6', '#e31b6d', '#ff8fb8', '#f4f4f4', '#b0b0b0', '#5a5a5a',
  '#151515', '#8b5a2b', '#e0d6b8', '#00c2a8', '#9ad600'];

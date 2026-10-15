/*
 * Fitness page — Gym Planner (no dependencies). Stage 1 financial model, 2026-10-15.
 *
 * The visitor enters only the floor area; concept, building condition, demand scenario and
 * HVAC reuse are labelled defaults in "Advanced settings". One Spain reference baseline
 * (REFERENCE, EUR, Spanish VAT) applies to every visitor: never chosen by language, IP or
 * browser location. One deterministic
 * engine (analyze) derives, for one of seven concepts (personal-training studio, reformer
 * Pilates, boutique, functional, automated 24/7, budget, premium):
 *   space plan → equipment (verified 2026 supplier tariffs) → technical capacity
 *   → achievable members (planning assumption) → monthly ramp-up → revenue by stream
 *   (IVA per stream) → staffing (collective agreement) → opex → EBITDA → break-even
 *   → monthly cash flow until payback → operational / after-tax / equity payback.
 * Investment = itemised take-off (supplier tariff, CYPE unit prices, official rates,
 * 3DNA assumptions), each line with a source class and a ± band; the central estimate
 * is the headline, the low–high range is supporting information.
 * One report structure (sections) feeds the live section, the PDF and the print sheet.
 * Shared by the build (scripts/business-calc.js) and the browser (shared-calc/calc-tools.js).
 * Every number on the page, in the PDF and in the print sheet comes from run() below.
 * Texts: translations.json → fitnessPage.calc (es / en / ru / uk).
 * URL: ?m2=500&c=auto&cond=commercial&d=base&hvac=auto&v=4#calculadora
 */
(function (root) {
  // ======================================================================
  // ENGINE — generated from the approved Stage 1 prototype (gym-model v3,
  // 2026-10-15). Data and formulas are identical to the prototype; only the
  // investment line descriptions became keys (texts: translations.json).
  // ======================================================================

  // ---- equipment: verified supplier tariffs 2026 ----
  // Equipment from the supplier's verified 2026 professional tariffs (prices excl. IVA).
  // AS  = "Tarifa profesional 2026 · Máquinas American Strength" (GymDescuento, distribuidor oficial)
  // ASP = "Tarifa profesional 2026 · Máquinas American Strength Premium"
  // ACC = "Tarifa profesional 2026 · Catálogo de accesorios GymDescuento"
  // Every entry: doc, page, ref, unit price; m2 = floor footprint incl. clearance (3DNA planning assumption).
  const C = (doc, page, ref, name, price) => ({ doc, page, ref, name, price });
  const ITEMS = {
    // cardio
    treadmill:      { m2: 4.5, kw: 2.2, src: C("AS", 49, "CARD-01", "Cinta de Correr Motorizada Pro", 1413) },
    treadmillPrem:  { m2: 4.8, kw: 2.2, src: C("AS", 49, "CARD-02", "Cinta de Correr Motorizada Multiagarre", 1523) },
    curveTread:     { m2: 4.2, kw: 0,   src: C("AS", 50, "CARD-05", "Cinta de Correr Curva-Autopropulsada", 1181) },
    elliptical:     { m2: 3.5, kw: 0.1, src: C("AS", 51, "CARD-08", "Elíptica con Consola", 994) },
    bike:           { m2: 2.5, kw: 0.05, src: C("AS", 51, "CARD-09", "Bicicleta Estática Vertical con Consola", 663) },
    recumbent:      { m2: 3.0, kw: 0.05, src: C("AS", 51, "CARD-10", "Bicicleta Estática Reclinada con Consola", 729) },
    stairmill:      { m2: 3.5, kw: 0.5, src: C("AS", 50, "CARD-04", "Escaladora de Escalones-Stepmill con Consola", 1325) },
    rower:          { m2: 3.5, kw: 0,   src: C("AS", 51, "CARD-12", "Remo Cardio de Aire", 365) },
    ski:            { m2: 2.0, kw: 0,   src: C("AS", 52, "CARD-17", "Máquina de Esquí Cardio", 409) },
    airbike:        { m2: 2.5, kw: 0,   src: C("AS", 52, "CARD-16", "Bicicleta Estática de Aire", 420) },
    spinBike:       { m2: 2.2, kw: 0,   src: C("AS", 52, "CARD-14", "Bicicleta Estática de Spinning Magnética", 552) },
    sled:           { m2: 12,  kw: 0,   src: C("AS", 53, "CARD-20", "Trineo de Peso Empuje-Arrastre con Ruedas", 742) },
    // strength (standard line)
    selectorized:   { m2: 5.5, kw: 0, src: C("AS", 40, "HP-15", "Máquina selectorizada serie HP (p. ej. Jalón al Pecho)", 983) },
    legPress:       { m2: 7.0, kw: 0, src: C("AS", 39, "HP-10", "Prensa de Piernas Lineal Horizontal (Selectorizada)", 1231) },
    cableCross:     { m2: 9.0, kw: 0, src: C("AS", 60, "EB-37", "Estación de Cruce de Poleas con Dominadas (Selectorizada)", 1148) },
    smith:          { m2: 7.0, kw: 0, src: C("AS", 46, "TEB-10", "Máquina Smith-Multipower Vertical con Almacenajes", 1110) },
    // strength (premium line)
    premSelect:     { m2: 6.0, kw: 0, src: C("ASP", 7, "ID 16", "Máquina de placas Premium (serie Nautilium Placa)", 2537.82) },
    premPlate:      { m2: 6.5, kw: 0, src: C("ASP", 3, "ID 1", "Máquina de palanca Premium (serie Nautilium Palanca)", 1610.96) },
    // free weights
    rack:           { m2: 9.0, kw: 0, src: C("AS", 53, "EB-01", "Power Rack-Jaula de Potencia con Dominadas", 398) },
    bench:          { m2: 4.0, kw: 0, src: C("AS", 45, "TEB-09", "Banco de Pesas Ajustable (Niveles Perforados)", 288) },
    barbell:        { m2: 0,   kw: 0, src: C("ACC", 47, "251", "Barra olímpica 2,20 m con rodamientos, 1000 lb", 130.32) },
    bumperSet70:    { m2: 0,   kw: 0, src: C("ACC", 3, "001-004", "Discos bumper negros 2×20 + 2×10 + 2×5 kg", 242.98) },
    plateTree:      { m2: 1.0, kw: 0, src: C("AS", 44, "TEB-01", "Disquetero Árbol para discos olímpicos", 132) },
    dbRack:         { m2: 3.0, kw: 0, src: C("ACC", 62, "332", "Mancuernero hexagonal 2 alturas", 269.36) },
    dbSetHex:       { m2: 0,   kw: 0, src: C("ACC", 61, "327", "Juego mancuernas hexagonales goma 2,5–30 kg (12 pares)", 865.95) },
    dbSetUrethane:  { m2: 0,   kw: 0, src: C("ACC", 54, "288", "Juego mancuernas uretano 2,5–30 kg (12 pares)", 1891.72) },
    // functional
    rigWall:        { m2: 24,  kw: 0, src: C("ACC", 30, "164", "Jaula de Crosstraining tipo Pared 4,28 m (2 rack, 8 puestos)", 1269.73) },
    rigCentral:     { m2: 40,  kw: 0, src: C("ACC", 29, "160", "Jaula de Crosstraining tipo Central 4,28 m (4 rack, 8 puestos)", 3236.26) },
    kettlebellSet:  { m2: 1.5, kw: 0, src: C("ACC", 21, "113 + 091-098", "Rack kettlebells 2 alturas + 8 kettlebells competición 8–28 kg", 667.12) },
    plyoBox:        { m2: 0.6, kw: 0, src: C("ACC", 22, "118", "Cajón pliométrico madera 50-60-75 cm", 109.53) },
    medBall:        { m2: 0,   kw: 0, src: C("ACC", 73, "390", "Balón medicinal premium 5 kg", 33.17) },
    wallBall:       { m2: 0,   kw: 0, src: C("ACC", 11, "053", "Wall ball 9 kg", 44.69) },
    battleRope:     { m2: 10,  kw: 0, src: C("ACC", 23, "122", "Battle rope 15 m 50 mm con funda", 127.5) },
    mat:            { m2: 2.0, kw: 0, src: C("ACC", 87, "475", "Esterilla acolchada 1800×580×15 mm", 16.42) },
    suspension:     { m2: 0,   kw: 0, src: C("ACC", 70, "371", "Kit de entrenamiento en suspensión", 36.32) },
    step:           { m2: 0,   kw: 0, src: C("ACC", 70, "374", "Deck step aeróbico", 129.25) },
    // not in the supplier tariffs: price is a 3DNA assumption pending a quote
    reformer:       { m2: 7.5, kw: 0, custom: true, src: { doc: "—", page: 0, ref: "sin referencia", name: "Reformer de Pilates de estudio (pendiente de presupuesto)", price: 3500, note: "supuesto 3DNA: reformers profesionales ≈ 2.500–6.000 €; no figura en las tarifas del proveedor" } },
    // flooring material
    rubber15:       { perM2: true, src: C("ACC", 32, "167", "Loseta de caucho 15 mm (por m²)", 23.20) },
    rubber30:       { perM2: true, src: C("ACC", 32, "168", "Loseta de caucho 30 mm (por m²)", 36.00) },
    rubber40:       { perM2: true, src: C("ACC", 32, "169", "Loseta de caucho 40 mm (por m²)", 42.37) },
  };

  // ---- parameters and sources ----
  const SOURCES = {
    CONVENIO: { title: "V Convenio colectivo estatal de instalaciones deportivas y gimnasios, Anexo II (tablas 2025)", url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1506", date: "BOE 26-01-2024; consultado 2026-10-15" },
    SMI2026: { title: "Real Decreto 126/2026, salario mínimo interprofesional 2026 (17.094 €/año)", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-3815", date: "BOE 19-02-2026" },
    COTIZ2026: { title: "Orden PJC/297/2026, bases y tipos de cotización 2026", url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296", date: "BOE 31-03-2026" },
    RENT: { title: "idealista — precio medio de alquiler de locales (>300 m² y 300–1.500 m²) por ciudad y distrito", url: "https://www.idealista.com/alquiler-locales/", date: "consultado 2026-10-15 (precios de oferta)" },
    ELEC: { title: "Eurostat nrg_pc_205, electricidad no doméstica España, banda IB, sin IVA, 2026-S1", url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table", date: "2026-S1" },
    FEE_BUDGET: { title: "Basic-Fit, Fitness Park, VivaGym (GymMatch), Synergym — cuotas publicadas", url: "https://www.basic-fit.com/es-es/clubs/basic-fit-madrid-calle-juan-mieg-12-f779d24119104569af03a5656d220c74.html", date: "consultado 2026-10-15" },
    FEE_24: { title: "Anytime Fitness Madrid — cuotas publicadas (34,90–54,90 €)", url: "https://www.anytimefitness.com/es-es/locations/hortaleza-madrid-sp-0060", date: "consultado 2026-10-15" },
    FEE_FUNC: { title: "Tarifas publicadas de boxes funcionales/CrossFit en Granada, Málaga, Madrid y Barcelona (Singular Box, Soma Box, CrossFit Málaga, Box Olimpo, Termópilas, CrossFit 78/79, BFactory, Refugio…)", url: "https://singularboxgranada.com/tarifas/", date: "consultado 2026-10-15" },
    FEE_BOUT: { title: "2Playbook «Mapa del pricing del fitness 2025» (boutique Madrid 122 €, Barcelona >90 €); Pilatia.es reformer Madrid", url: "https://www.2playbook.com/fitness/precio-gimnasios-en-espana-se-eleva-3-en-2025-hasta-568-euros-mes_20252_102.html", date: "publicado 23-10-2025" },
    FEE_PREM: { title: "2Playbook «Mapa del pricing del fitness 2025» (premium Madrid/Barcelona >130 €); GO fit / Forus (GymMatch)", url: "https://www.2playbook.com/fitness/precio-gimnasios-en-espana-se-eleva-3-en-2025-hasta-568-euros-mes_20252_102.html", date: "publicado 23-10-2025" },
    MARKET: { title: "España Activa / Deloitte / FNEID — informe del sector 2025 (1,5 visitas/socio/semana; 38,2 €/socio/mes)", url: "https://gymfactory.net/2026/09/24/el-fitness-espanol-tiene-margen-para-918-nuevos-gimnasios-segun-el-informe-completo-de-espana-activa-y-deloitte/", date: "publicado 24-09-2026" },
    BASICFIT: { title: "Basic-Fit Annual Report 2025 (2.902 socios/club, permanencia media 24 meses)", url: "https://annualreport.basic-fit.com/2025/mbr/business-and-financial-review/", date: "2025" },
    ANYTIME: { title: "Anytime Fitness España: 50 clubes, >50.000 socios, clubes de 740–950 m²", url: "https://emprendedores.es/franquicias/franquicias-actualidad/anytime-fitness-alcanza-los-50-clubes-en-espana/", date: "nov. 2025" },
    TARIFF_2026: { title: "Tarifas profesionales 2026 GymDescuento (American Strength, American Strength Premium, Accesorios) — PDF del distribuidor", url: "https://gymdescuento.es", date: "verificado 2026-10-14" },
    CYPE: { title: "CYPE Ingenieros, Generador de precios de la construcción — Rehabilitación, España (costes directos, sin GG/BI/IVA; sin coeficiente provincial)", url: "https://generadordeprecios.info/rehabilitacion/", date: "consultado 2026-10-15; fecha de base no publicada" },
    FEES_CACOA: { title: "Junta de Andalucía, CONTR 2025/344797 — honorarios según Criterios Orientativos CACOA / módulos COA Sevilla 2025", url: "https://www.juntadeandalucia.es/haciendayadministracionpublica/apl/pdc_sirec_documentacion/rest/descargar/documento/325960", date: "adenda 14-07-2025" },
    ICIO_GRANADA: { title: "Ordenanza ICIO Granada (4 %)", url: "https://normatia.com/es/normativa/impuesto-construcciones-granada/2026/introduccion/", date: "versión 2026 (agregador)" },
    ICIO_MALAGA: { title: "Ordenanza Fiscal nº 4 Málaga, ICIO 3,8 %", url: "https://www.malaga.eu/export/sites/malagaeu/gobierno-abierto/.galleries/Publicidad-Activa/Informacion-de-relevancia-juridica/Expte-004_2023.-Modificacion-OOFF-N-4_-ICIO-2024_-Acuerdo-Pleno-26.10.2023.pdf", date: "2024, congelado 2025–2026" },
    ICIO_MADRID: { title: "ICIO Madrid 3,75 % desde 2024 (no verificado el texto 2026)", url: "https://sede.madrid.es/", date: "no verificado" },
    ICIO_BCN: { title: "Ordenança fiscal 2.1 Barcelona, ICIO 4 %", url: "https://ajuntament.barcelona.cat/hisenda/en/procedures-payments/icio", date: "texto 2024 (2026 no abierto)" },
    LIC_GRANADA: { title: "Ordenanza de licencias de edificación Granada 2025 (declaración responsable de apertura)", url: "https://normatia.com/es/normativa/licencias-edificacion-granada/2025/articulado/", date: "2025 (agregador)" },
    LIC_MADRID: { title: "Madrid OF 10/2023, tasa por servicios urbanísticos 2026, arts. 19–20", url: "https://normatia.com/es/normativa/tasa-prestacion-servicios-urbanisticos-madrid/2026/articulado/", date: "2026 (agregador, parcialmente verificado)" },
    BENCH_CAPEX: { title: "Inversión por club: Basic-Fit 1,33 M€ (2025), Synergym ≈ 1 M€, Anytime Fitness ≈ 1.100 €/m²", url: "https://www.marketscreener.com/news/basic-fit-n-investor-presentation-march-2026-ce7f58ddd180fe25", date: "2025–2026" },
    IVA2026: { title: "AEAT — Tipos impositivos IVA 2026 (tipo general 21 %, art. 90.Uno Ley 37/1992; los servicios de gimnasio no figuran entre los tipos reducidos)", url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/IVA/IVA_reperc/Tipos_IVA_2026_26_02_2026.pdf", date: "26-02-2026" },
    RITE: { title: "RITE (RD 1027/2007), IT 1.1.4.2 — gimnasios y locales deportivos = IDA 3 (8 l/s·persona a 1,2 met; actividad física: método por CO2); IT 1.2.4.5.2 recuperación de calor si el aire expulsado > 0,5 m³/s", url: "https://www.certicalia.com/blog/renovaciones-aire-segun-rite", date: "consultado 2026-10-15 (umbral de recuperación pendiente de verificar en el BOE)" },
    ASHRAE: { title: "ASHRAE Handbook Fundamentals, cap. 18, tabla 1 — ganancia de calor por ocupante, «athletics»: ≈ 525–585 W totales", url: "https://www.ashrae.org/technical-resources/ashrae-handbook", date: "edición 2021 (valor de referencia, no reproducido)" },
    PT_PRICE: { title: "Cronoshare — precio medio entrenador personal provincia de Málaga (21–31 €/sesión, Torre del Mar)", url: "https://www.cronoshare.com/servicios/entrenador-personal/malaga/torre-del-mar", date: "consultado 2026-10-15 (marketplace; capitales sin dato verificado)" },
    DGT_V3319_20: { title: "DGT consulta vinculante V3319-20 — entrenamiento personal y en grupo: sujeto y no exento, 21 %; fisioterapia terapéutica: exenta (art. 20.Uno.3º LIVA)", url: "https://www.fiscal-impuestos.com/sites/fiscal-impuestos.com/files/NFC084449.pdf", date: "2020 (consultado 2026-10-15)" },
    TJUE_C330_21: { title: "TJUE C-330/21 (22-09-2022) — el acceso al gimnasio con acompañamiento puede tener tipo reducido solo si el Estado lo prevé; la ley española no lo prevé", url: "https://www.fiscal-impuestos.com/tjue-iva-tipo-reducido-uso-instalaciones-gimnasio-acompanamiento-individual-grupal.html", date: "2022" },
    VAT_FOOD: { title: "LIVA art. 91.Uno.1.1º (alimentos 10 %); bebidas con azúcares o edulcorantes añadidos al 21 % desde 2021 (Ley 11/2020)", url: "https://www.consumer.es/alimentacion/aumento-iva-refrescos.html", date: "2021 (vigencia 2026 no verificada)" },
    IS2026: { title: "Impuesto sobre Sociedades 2026: general 25 %, empresas de reducida dimensión 23 %, microempresas 19 %/21 %, nueva creación 15 % (Ley 7/2024)", url: "https://administracion.gob.es/pag_Home/es/Tu-espacio-europeo/derechos-obligaciones/empresas/impuestos/sociedades/info-general.html", date: "actualizado 19-03-2026" },
    RITE_ART15: { title: "RITE art. 15 — proyecto si la potencia térmica nominal > 70 kW; memoria técnica entre 5 y 70 kW", url: "https://www.aparejadoresmadrid.es/documents/d/aparejadores/nota-rite-_instalacionesprecisanproyecto", date: "consultado 2026-10-15 (nota de colegio profesional)" },
    A: { title: "Supuesto 3DNA (no verificado; pendiente de confirmar)", url: "", date: "2026-10" },
  };
  
  // IVA per revenue stream. "other" is a blended rate for a shop mix.
  const VAT = {
    membership: 0.21,   // DGT_V3319_20 + TJUE_C330_21: no reduced rate for gym access in Spanish law
    enrolment: 0.21,    // A: ancillary to the membership → follows the principal service
    pt: 0.21,           // DGT_V3319_20: personal training 21 %, not exempt
    other: 0.155,       // A: 50 % water / unsweetened food and supplements at 10 % + 50 % sugared drinks, clothing, accessories at 21 % (VAT_FOOD)
  };
  const GLOBAL = { iva: 0.21, peakComfort: 0.85, memberBand: 0.10, depositMonths: 2, preOpeningPayrollMonths: 1 };
  
  const TRAINING_ZONES = ["cardio", "strength", "free", "functional", "studio", "cycle"];
  // floor finish per zone (installation priced per m²; rubber tiles come from the supplier tariff)
  const FLOOR = { cardio: "rubber", strength: "rubber", free: "rubber", functional: "rubber", studio: "sprung", cycle: "rubber", reception: "vinyl", changing: "tile", showers: "tile", staff: "vinyl", storage: "vinyl", technical: "vinyl", circulation: "vinyl", recovery: "vinyl" };
  
  // wageFactor (A): market pay above the state convenio table (Madrid, Barcelona); ptPrice (A, PT_PRICE): €/session IVA incl.
  const CITIES = {
    // rent: secondary / residential districts for 300–1.500 m² (idealista >300 m² averages, 2026-10-15)
    granada:   { name: "Granada",   rent: 7.0,  rentRange: [5, 9],  icio: 0.04,   icioSrc: "ICIO_GRANADA",   licence: (a) => 510.32 * (a > 1250 ? 3.15 : a > 500 ? 2.74 : a > 200 ? 2.31 : 1), licenceSrc: "LIC_GRANADA", wageFactor: 1.0, ptPrice: 28 },
    malaga:    { name: "Málaga",    rent: 9.5,  rentRange: [7, 12], icio: 0.038,  icioSrc: "ICIO_MALAGA",    licence: () => 1500, licenceSrc: "A", wageFactor: 1.0, ptPrice: 30 },
    madrid:    { name: "Madrid",    rent: 12.5, rentRange: [9, 16], icio: 0.0375, icioSrc: "ICIO_MADRID",    licence: (a) => 628.76 + Math.max(0, Math.ceil((a - 500) / 100)) * 20.49 + 1252.70 + Math.max(0, Math.ceil((a - 500) / 100)) * 200.47, licenceSrc: "LIC_MADRID", wageFactor: 1.10, ptPrice: 45 },
    barcelona: { name: "Barcelona", rent: 12.0, rentRange: [9, 15], icio: 0.04,   icioSrc: "ICIO_BCN",       licence: () => 1500, licenceSrc: "A", wageFactor: 1.12, ptPrice: 45 },
  };
  
  const WAGES = {
    hoursYear: 1752, employerSS: 0.3365, smi2026: 17094,
    // convenio 2025 annual base (2026 tables not published: art. 39 extension unverified) — the model pays max(convenio, SMI 2026)
    groups: {
      G1: { annual2026: 19917.08, role: "Gerente de gimnasio" },
      G2N1: { annual2026: 18257.32, role: "Director de departamento (comercial, técnico)" },
      G2N2: { annual2026: 17688.26, role: "Responsable de mantenimiento / fisioterapeuta" },
      G3N1: { annual2026: 17081.85, role: "Coordinador (fitness, actividades, recepción)" },
      G3N2: { annual2026: 16680.87, role: "Monitor polivalente / entrenador" },
      G4N1: { annual2026: 16279.89, role: "Recepcionista / monitor de una disciplina" },
      G5: { annual2026: 16071.12, role: "Limpieza / peón de mantenimiento" },
    },
  };
  
  const OPEX = {
    kwhPrice: 0.1631,                 // ELEC
    waterPerVisit: 0.12,              // A: ≈ 45 l per visit with shower × ≈ 2,6 €/m³ (water + sewerage); tariffs unverified
    cleaningPerM2: 2.0,               // A: outsourced cleaning (24/7 format)
    equipmentMaintYear: 0.06,         // A
    buildingMaintYear: 0.01,          // A
    insuranceBase: 100, insurancePerM2: 0.25,   // A
    softwareBase: 120, softwarePerMember: 0.6,  // A
    marketingShare: 0.05, launchMarketingMonthly: 2000, launchMarketingPreOpening: 8000,   // A
    launchMonths: 6,                            // A: launch marketing during months 1–6
    otherShare: 0.015, otherBase: 250,          // A: music licence (SGAE/AGEDI), consumables, small items
    paymentFeeShare: 0.01,                      // A: SEPA direct debit / card fees on gross collections
    otherCogs: 0.6,                             // A: cost of goods for drinks, supplements, merchandise
  };
  
  // CYPE unit prices: "Generador de precios", Rehabilitación, España (national, no provincial coefficient),
  // costes directos incl. 2 % complementarios, excl. GG/BI/IVA, read 2026-10-15. Quantities per m² / per user are 3DNA assumptions.
  const CYPE = {
    demolPartition: 8.82, floorRemoval: 10.68, ceilingRemoval: 8.35, skip: 99.53 + 49.11, screed: 41.41,
    partition: 35.78, partitionWet: 120.68, ceilingAcoustic: 28.46, ceilingWet: 49.25, paint: 8.57,
    rubberInstalled: 34.72, sportsVinyl: 30.66, studioFloor: 69.83, vinylTiles: 25.21, wetFloor: 38.99, wallTile: 38.38,
    showerTray: 179.56, showerColumn: 309.61, drain: 15.39, wc: 283.41, wcFrame: 81.32, wcCistern: 428.29, basin: 244.10, basinTap: 242.04,
    cubicle: 819.07, roomSupply: 610.18, roomDrainage: 445.36, locker2: 205.12, benchM: 124.11, accessibleKit: 2560,
    vrfOutPerKw: 7172.33 / 12.1, vrfInPerKw: 2471.32 / 2.8, aerothermPerKw: 7816.43 / 19.5, hruPerM3h: 13971.35 / 1200,
    board: 536.65, circuit1: 5.38, circuit3: 8.70, ledPanel: 58.98, ledLinear: 348.61, emergencyLight: 48.58,
    dhwHeatPump: 3065.97, extinguisher: 48.29, firePanel: 308.20, smokeDetector: 50.61, callPoint: 40.72, sounder: 66.14,
  };
  const COSTS = {
    src: "CYPE",
    overheadsProfit: 0.19,             // A: contractor GG + BI on direct costs (13 % + 6 % public-works convention)
    // building condition: strip-out and base works before the fit-out
    condition: {
      shell:      { hvacReuseDefault: "none", strip: 0,   screed: 1.0, services: 1.0,  finishes: 1.15, note: "local en bruto: solera nueva, instalaciones y acabados completos" },
      commercial: { hvacReuseDefault: "none", strip: 1.0, screed: 0.3, services: 0.9,  finishes: 1.0,  note: "antiguo comercio u oficina: desmontaje, reparación de solera, acometidas reutilizables" },
      exgym:      { hvacReuseDefault: "partial", strip: 0.3, screed: 0.1, services: 0.6,  finishes: 0.8,  note: "antiguo gimnasio: se reutiliza parte de vestuarios e instalaciones" },
    },
    qty: {                             // A: take-off ratios
      partitionPerM2: 0.45, ceilingShare: 0.6, paintPerM2: 2.0, demolPartitionPerM2: 0.3, m2PerSkip: 40,
      peoplePerShower: 8, peoplePerWc: 25, wallTilePerShower: 6,
      m2PerLedPanel: 7, m2PerEmergency: 30, m2PerBoard: 150, circuit1PerM2: 0.8, circuit3PerM2: 0.15, socketsDataUplift: 0.3,
      m2PerExtinguisher: 150, m2PerDetector: 60,
    },
    deliveryShare: 0.08,              // A: transport + assembly of equipment
    receptionDesk: { 0.85: 5000, 0.9: 6000, 1.0: 8000, 1.3: 14000, 1.4: 18000 },   // A by finish level
    access: { turnstiles: 18000, app: 6000, premium: 28000, auto24: 24000 },      // A: access control / automation (unverified quotes)
    avPerM2: 14, signageBase: 3000, signagePerM2: 5,                              // A
    feesShare: 0.0911,                // CACOA / COA Sevilla 2025 modules: ejecución 3,15 + dirección de obra 2,63 + ejecución 2,63 + SyS 0,70 % (Junta de Andalucía, CONTR 2025/344797)
    contingency: 0.10,                // A: 10–20 % published guidance (unverified); 10 % on a defined scenario
  };
  // HVAC sized from loads (cooling, design day) + ventilation. Plant priced per kW of cooling.
  const HVAC = {
    wPerPersonExercise: 525,          // ASHRAE: athletics, total (sensible + latent) per occupant at peak
    lightingWm2: 8,                   // A: LED, CTE HE3-compliant
    equipmentDiversity: 0.5,          // A: average draw / rated kW of powered cardio
    envelopeWm2: 35,                  // A: ground-floor premises with shopfront, southern Spain; 25–50 W/m² depending on glazing and orientation
    ventM3hPerPerson: 45,             // A: 12,5 l/s per exercising person (RITE IDA 3 = 8 l/s at 1,2 met; exercise ≈ 3–6 met → CO2 method gives more)
    summerDeltaT: 9, latentFactor: 2.0, hruEfficiency: 0.5,   // A: design ΔT outdoor–indoor, total/sensible ratio of outdoor air, sensible recovery
    hruThresholdM3h: 1800,            // RITE IT 1.2.4.5.2: recovery mandatory above 0,5 m³/s
    hruRefM3h: 1200, hruRefPrice: 13971.35, scaleExponent: 0.7,   // CYPE recuperador 1.200 m³/h; larger units by the 0,7 cost-capacity rule (A)
    ventNoRecoveryShare: 0.5,         // A: supply + extract fans with filters, no recovery, vs recovery unit
    ventDuctShare: 0.30,              // A: ductwork, grilles, diffusers per € of air-handling unit
    systems: {
      split: { label: "bomba de calor de conductos / rooftop", cypePerKw: 584, installShare: 0.35, coverage: 1.0, cypeNote: "CYPE: equipo de conductos aire-aire, precio ÷ kW frigoríficos nominales" },
      vrf:   { label: "VRF con unidades interiores de conductos", cypePerKw: 592.75 + 882.61, installShare: 0.20, coverage: 1.0, cypeNote: "CYPE: VRF exterior 7.172 €/12,1 kW + interior 2.471 €/2,8 kW" },
      ventLed: { label: "ventilación + ventiladores HVLS + frío parcial (40 % de la carga)", cypePerKw: 584, installShare: 0.35, coverage: 0.4, hvlsPerM2: 5500 / 300, cypeNote: "CYPE conductos sobre el 40 % de la carga; HVLS: supuesto 3DNA 5.500 € por 300 m²" },
    },
    reuse: { none: 1.0, partial: 0.5, full: 0.15 },
    // preliminary-estimate sensitivity (low / high) on the uncertain load inputs
    sensitivity: { wPerPersonExercise: [400, 585], envelopeWm2: [25, 50], ventM3hPerPerson: [28.8, 45] },
    projectThresholdKw: 70,           // RITE_ART15   // A: share of plant + distribution still to buy (partial = reuse ducts / part of the units; full = inspection, recharge, adaptation)
  };
  // Investor view (A unless marked): after corporate tax, replacement capex and financing
  const INVESTOR = {
    taxRate: 0.23,                    // IS2026: reduced-size company 2026 (general 25 %; new company 15 % in its first 2 profitable years — not applied)
    depreciationYears: { construction: 10, equipment: 8 },   // A: fit-out over a 10-year lease; equipment within the tax-table maximum (12 %/year)
    replacementStartYear: 4, replacementShareYear: 0.10,     // A: from year 4, 10 % of the equipment tariff value each year
    debtShare: 0.60, rate: 0.065, termMonths: 84,            // A: bank loan for 60 % of capex, 6.5 %, 7 years, French amortisation
    horizonMonths: 180,
  };
  // ± on each line, by source class, within one scenario (concept + city + condition + demand)
  const UNCERTAINTY = { tariff: 0.05, cype: 0.12, official: 0.05, assumption: 0.25 };

  // ---- business concepts ----
  const fteFor = (weekH, yearH = 1752) => (weekH * 52) / yearH;
  
  const CONCEPTS = {
    budget: {
      name: "Budget gym", priority: 2,
      area: { min: 700, ideal: [1000, 2500], max: 5000 },
      hours: { weekday: 16, weekend: 12 },
      support: { reception: { base: 10, share: 0.012 }, changing: { base: 20, share: 0.05 }, showers: { base: 8, share: 0.025 },
        staff: { base: 8, share: 0.006 }, storage: { base: 5, share: 0.008 }, technical: { base: 8, share: 0.015 }, circulation: { base: 0, share: 0.10 } },
      mix: { cardio: 0.30, strength: 0.30, free: 0.22, functional: 0.10, studio: 0.08 },
      m2PerUser: 4.0, sessionMin: 75, peakHourShare: 0.11, weekendFactor: 0.6, visitsPerWeek: 1.5,
      utilisation: { conservative: 0.35, base: 0.41, optimistic: 0.46 },          // calibrated: ≈ 2.900 socios en ≈ 1.500 m² (BASICFIT)
      ramp: { months: 24, opening: 0.35 }, churnMonthly: 0.04,                    // BASICFIT: permanencia media 24 meses
      fee: { granada: 27.9, malaga: 28.9, madrid: 31.9, barcelona: 31.9 }, feeSrc: "FEE_BUDGET", enrolmentFee: 20,
      pt: { share: 0.03, sessionsPerMonth: 2, priceFactor: 1.0, trainerShare: 0.6 }, otherPerMember: 0.8,
      finish: 0.9, hvacSystem: "split", kwhPerM2Year: 110, access: "turnstiles", lockersPerPeak: 1.2, cleaningOutsourced: false, rubber: "rubber30",
      kit: {
        cardio: [{ item: "treadmill", share: 0.42 }, { item: "elliptical", share: 0.2 }, { item: "bike", share: 0.18 }, { item: "stairmill", share: 0.1 }, { item: "rower", share: 0.1 }],
        strength: [{ item: "selectorized", share: 0.72 }, { item: "legPress", share: 0.12 }, { item: "cableCross", share: 0.16 }],
        free: [{ item: "rack", share: 0.3 }, { item: "smith", share: 0.15 }, { item: "bench", share: 0.25 }, { item: "dbRack", share: 0.1 }, { item: "dbSetHex", per: 60 }, { item: "barbell", per: 25 }, { item: "bumperSet70", per: 25 }, { item: "plateTree", per: 40 }],
        functional: [{ item: "rigWall", share: 0.4 }, { item: "kettlebellSet", share: 0.1 }, { item: "plyoBox", per: 12 }, { item: "mat", per: 4 }, { item: "sled", share: 0.2 }],
        studio: [{ item: "mat", per: 3 }, { item: "step", per: 3 }],
      },
      staff: (area, h) => [
        { role: "manager", group: "G1", fte: 1, marketFactor: 1.35 },
        { role: "staffOnDuty", group: "G4N1", fte: h.fteFor(h.openWeekH) },                       // one person on duty (reception + floor) all opening hours
        { role: "trainer", group: "G3N2", fte: h.fteFor(Math.min(h.openWeekH, 20 * area / 1000)) },   // coaching hours at peak
        { role: "cleaning", group: "G5", fte: h.fteFor(area / 150 * 7) },                        // 150 m²/h, daily
      ],
    },
    functional: {
      name: "Functional training gym", priority: 1,
      area: { min: 180, ideal: [250, 700], max: 1200 },
      hours: { weekday: 15, weekend: 6 },
      support: { reception: { base: 6, share: 0.01 }, changing: { base: 10, share: 0.05 }, showers: { base: 6, share: 0.03 },
        staff: { base: 0, share: 0.0 }, storage: { base: 6, share: 0.015 }, technical: { base: 4, share: 0.012 }, circulation: { base: 0, share: 0.08 } },
      mix: { functional: 0.62, free: 0.18, cardio: 0.12, studio: 0.08 },
      m2PerUser: 5.5, sessionMin: 60, peakHourShare: 0.16, weekendFactor: 0.4, visitsPerWeek: 2.8,
      utilisation: { conservative: 0.46, base: 0.55, optimistic: 0.62 },
      ramp: { months: 12, opening: 0.3 }, churnMonthly: 0.03,
      fee: { granada: 70, malaga: 72, madrid: 85, barcelona: 100 }, feeSrc: "FEE_FUNC", enrolmentFee: 20,
      pt: { share: 0.05, sessionsPerMonth: 3, priceFactor: 1.0, trainerShare: 0.5 }, otherPerMember: 1.5,
      finish: 0.85, hvacSystem: "split", kwhPerM2Year: 70, access: "app", lockersPerPeak: 1.0, cleaningOutsourced: false, rubber: "rubber40",
      kit: {
        functional: [{ item: "rigCentral", share: 0.35 }, { item: "rower", per: 30 }, { item: "airbike", per: 35 }, { item: "ski", per: 45 }, { item: "sled", per: 120 },
          { item: "kettlebellSet", per: 70 }, { item: "plyoBox", per: 15 }, { item: "wallBall", per: 12 }, { item: "barbell", per: 15 }, { item: "bumperSet70", per: 15 }, { item: "battleRope", per: 80 }, { item: "mat", per: 8 }],
        free: [{ item: "rack", share: 0.35 }, { item: "bench", share: 0.2 }, { item: "dbRack", share: 0.1 }, { item: "dbSetHex", per: 60 }, { item: "plateTree", per: 40 }],
        cardio: [{ item: "curveTread", share: 0.3 }, { item: "rower", share: 0.3 }, { item: "airbike", share: 0.25 }],
        studio: [{ item: "mat", per: 3 }],
      },
      staff: (area, h) => [
        { role: "headCoach", group: "G3N1", fte: 1, marketFactor: 1.2 },
        { role: "coach", group: "G3N2", fte: h.fteFor(h.openWeekH * 0.8 + 15 * Math.max(1, area / 500)) },   // a coach in every class + a 2nd coach at peak
        { role: "frontDesk", group: "G4N1", fte: h.fteFor(Math.min(20, h.openWeekH * 0.25)) },
        { role: "cleaning", group: "G5", fte: h.fteFor(area / 150 * 6) },
      ],
    },
    premium: {
      name: "Premium fitness club", priority: 3,
      area: { min: 900, ideal: [1500, 4000], max: 6000 },
      hours: { weekday: 16, weekend: 12 },
      support: { reception: { base: 20, share: 0.02 }, changing: { base: 30, share: 0.08 }, showers: { base: 10, share: 0.04 },
        staff: { base: 10, share: 0.01 }, storage: { base: 6, share: 0.01 }, technical: { base: 10, share: 0.02 }, circulation: { base: 0, share: 0.10 }, recovery: { base: 20, share: 0.05 } },
      mix: { cardio: 0.26, strength: 0.26, free: 0.18, functional: 0.12, studio: 0.12, cycle: 0.06 },
      m2PerUser: 6.0, sessionMin: 90, peakHourShare: 0.12, weekendFactor: 0.7, visitsPerWeek: 2.2,
      utilisation: { conservative: 0.50, base: 0.60, optimistic: 0.67 },
      ramp: { months: 24, opening: 0.25 }, churnMonthly: 0.025,
      fee: { granada: 72, malaga: 80, madrid: 115, barcelona: 115 }, feeSrc: "FEE_PREM", feeNote: "Madrid / Barcelona: cuota realizada ≈ 88 % de la tarifa >130 € (descuentos familiares y de empresa, supuesto 3DNA); Granada / Málaga: supuesto 3DNA", enrolmentFee: 100,
      pt: { share: 0.08, sessionsPerMonth: 3, priceFactor: 1.3, trainerShare: 0.5 }, otherPerMember: 6,
      finish: 1.4, hvacSystem: "vrf", kwhPerM2Year: 200, access: "premium", lockersPerPeak: 1.5, cleaningOutsourced: false, rubber: "rubber30",
      kit: {
        cardio: [{ item: "treadmillPrem", share: 0.42 }, { item: "elliptical", share: 0.2 }, { item: "recumbent", share: 0.12 }, { item: "stairmill", share: 0.14 }, { item: "rower", share: 0.12 }],
        strength: [{ item: "premSelect", share: 0.6 }, { item: "premPlate", share: 0.25 }, { item: "cableCross", share: 0.15 }],
        free: [{ item: "rack", share: 0.25 }, { item: "smith", share: 0.12 }, { item: "bench", share: 0.25 }, { item: "dbRack", share: 0.12 }, { item: "dbSetUrethane", per: 60 }, { item: "barbell", per: 25 }, { item: "bumperSet70", per: 25 }, { item: "plateTree", per: 40 }],
        functional: [{ item: "rigWall", share: 0.4 }, { item: "sled", share: 0.2 }, { item: "kettlebellSet", share: 0.1 }, { item: "plyoBox", per: 15 }, { item: "mat", per: 5 }],
        studio: [{ item: "mat", per: 3 }, { item: "step", per: 3 }],
        cycle: [{ item: "spinBike", per: 2.4 }],
      },
      staff: (area, h) => [
        { role: "manager", group: "G1", fte: 1, marketFactor: 1.8 },
        { role: "salesTeam", group: "G2N1", fte: Math.max(1, area / 1000), marketFactor: 1.3 },
        { role: "reception", group: "G4N1", fte: h.fteFor(h.openWeekH * 2), marketFactor: 1.1 },       // 2 people at the desk all opening hours
        { role: "floorTrainer", group: "G3N2", fte: h.fteFor(h.openWeekH * Math.max(1, area / 800)), marketFactor: 1.2 },
        { role: "groupInstructor", group: "G3N2", fte: h.fteFor(Math.max(30, area / 40)), marketFactor: 1.3 },
        { role: "wellnessAttendant", group: "G4N1", fte: h.fteFor(h.openWeekH * 0.7) },
        { role: "maintenance", group: "G2N2", fte: Math.max(0.5, area / 1500) },
        { role: "cleaning", group: "G5", fte: h.fteFor(area / 100 * 7) },
      ],
    },
    boutique: {
      name: "Boutique studio", priority: 1,
      area: { min: 90, ideal: [120, 350], max: 600 },
      hours: { weekday: 14, weekend: 5 },
      support: { reception: { base: 4, share: 0.03 }, changing: { base: 6, share: 0.07 }, showers: { base: 3, share: 0.04 },
        staff: { base: 0, share: 0 }, storage: { base: 3, share: 0.02 }, technical: { base: 2, share: 0.015 }, circulation: { base: 0, share: 0.07 } },
      mix: { studio: 0.6, cycle: 0.4 },
      m2PerUser: 3.6, sessionMin: 60, peakHourShare: 0.12, weekendFactor: 0.6, visitsPerWeek: 2.0,   // classes spread over the day
      utilisation: { conservative: 0.21, base: 0.25, optimistic: 0.28 },          // ≈ 350 socios en 500 m² el primer año (Distrito Estudio, MARKET)
      ramp: { months: 18, opening: 0.35 }, churnMonthly: 0.035,
      fee: { granada: 85, malaga: 90, madrid: 122, barcelona: 95 }, feeSrc: "FEE_BOUT", feeNote: "Granada / Málaga: supuesto 3DNA", enrolmentFee: 30,
      pt: { share: 0.03, sessionsPerMonth: 2, priceFactor: 1.0, trainerShare: 0.5 }, otherPerMember: 1.5,
      finish: 1.3, hvacSystem: "split", kwhPerM2Year: 90, access: "app", lockersPerPeak: 1.0, cleaningOutsourced: false, rubber: "rubber15",
      kit: { studio: [{ item: "mat", per: 3 }, { item: "step", per: 3 }, { item: "suspension", per: 4 }, { item: "kettlebellSet", fixed: 1 }], cycle: [{ item: "spinBike", per: 2.4 }] },
      staff: (area, h) => [
        { role: "studioManager", group: "G3N1", fte: area < 200 ? 0.5 : 1, marketFactor: 1.2 },
        { role: "instructor", group: "G3N2", fte: h.fteFor(h.openWeekH * 0.75 * 1.15) * Math.max(area < 200 ? 0.75 : 1, area / 300), marketFactor: 1.3 },  // classes ≈ 75 % of hours + prep; boutique pay above the table
        { role: "frontDesk", group: "G4N1", fte: area < 200 ? 0 : h.fteFor(h.openWeekH * 0.6) },   // small studios: the instructor covers the desk
        { role: "cleaning", group: "G5", fte: h.fteFor(area / 150 * 6) },
      ],
    },
    auto24: {
      name: "Automated 24/7 gym", priority: 2,
      area: { min: 300, ideal: [400, 1000], max: 1500 },
      hours: { weekday: 24, weekend: 24 }, staffedHoursWeek: 40,
      support: { reception: { base: 6, share: 0.008 }, changing: { base: 12, share: 0.045 }, showers: { base: 6, share: 0.025 },
        staff: { base: 6, share: 0 }, storage: { base: 4, share: 0.008 }, technical: { base: 6, share: 0.015 }, circulation: { base: 0, share: 0.09 } },
      mix: { cardio: 0.32, strength: 0.32, free: 0.24, functional: 0.12 },
      m2PerUser: 4.5, sessionMin: 60, peakHourShare: 0.10, weekendFactor: 0.6, visitsPerWeek: 1.8,
      utilisation: { conservative: 0.20, base: 0.24, optimistic: 0.27 },          // calibrated: ≈ 1.000 socios en 740–950 m² (ANYTIME)
      ramp: { months: 18, opening: 0.25 }, churnMonthly: 0.035,
      fee: { granada: 36, malaga: 38, madrid: 42, barcelona: 42 }, feeSrc: "FEE_24", feeNote: "Granada / Málaga / Barcelona: supuesto 3DNA a partir de Madrid", enrolmentFee: 0,
      pt: { share: 0.03, sessionsPerMonth: 2, priceFactor: 1.0, trainerShare: 0.6 }, otherPerMember: 0.3,
      finish: 1.0, hvacSystem: "split", kwhPerM2Year: 120, access: "auto24", lockersPerPeak: 1.0, cleaningOutsourced: true, rubber: "rubber30",
      kit: {
        cardio: [{ item: "treadmill", share: 0.42 }, { item: "elliptical", share: 0.2 }, { item: "bike", share: 0.18 }, { item: "stairmill", share: 0.1 }, { item: "rower", share: 0.1 }],
        strength: [{ item: "selectorized", share: 0.72 }, { item: "legPress", share: 0.12 }, { item: "cableCross", share: 0.16 }],
        free: [{ item: "rack", share: 0.3 }, { item: "smith", share: 0.15 }, { item: "bench", share: 0.25 }, { item: "dbRack", share: 0.1 }, { item: "dbSetHex", per: 60 }, { item: "barbell", per: 25 }, { item: "bumperSet70", per: 25 }, { item: "plateTree", per: 40 }],
        functional: [{ item: "rigWall", share: 0.4 }, { item: "kettlebellSet", share: 0.1 }, { item: "plyoBox", per: 12 }, { item: "mat", per: 4 }],
      },
      staff: (area, h) => [
        { role: "clubManager", group: "G1", fte: 1, marketFactor: 1.35 },                     // manager + sales, staffed hours only
        { role: "staffedHours", group: "G4N1", fte: h.fteFor(Math.max(0, h.staffedWeekH - 40)) },
        { role: "trainer", group: "G3N2", fte: h.fteFor(15 * Math.max(1, area / 800)) },
      ],
    },
    // ---- small-space alternatives: capacity from stations (reformers, trainer–client pairs), not from floor m² per user
    pilates: {
      name: "Reformer Pilates studio", priority: 1,
      area: { min: 60, ideal: [80, 200], max: 350 },
      hours: { weekday: 13, weekend: 4 },
      support: { reception: { base: 4, share: 0.03 }, changing: { base: 6, share: 0.08 }, showers: { base: 2, share: 0.03 },
        staff: { base: 0, share: 0 }, storage: { base: 2, share: 0.02 }, technical: { base: 2, share: 0.01 }, circulation: { base: 0, share: 0.06 } },
      mix: { studio: 1 },
      capacityMode: "stations", classesPerWeek: 9 * 5 + 3 * 2,          // A: 9 classes per weekday, 3 per weekend day
      stations: (plan, eq) => (eq.lines.find((l) => l.item === "reformer") || { qty: 0 }).qty,
      get sessionsPerStationWeek() { return this.classesPerWeek; },
      m2PerUser: 7.5, sessionMin: 50, peakHourShare: 0.12, weekendFactor: 0.4, visitsPerWeek: 1.8,
      utilisation: { conservative: 0.50, base: 0.60, optimistic: 0.70 },  // A: average class fill
      ramp: { months: 12, opening: 0.35 }, churnMonthly: 0.04,
      fee: { granada: 85, malaga: 95, madrid: 135, barcelona: 130 }, feeSrc: "A", feeNote: "bono mensual de 8 clases de reformer; supuesto 3DNA pendiente de verificar con estudios locales", enrolmentFee: 20,
      pt: { share: 0.04, sessionsPerMonth: 2, priceFactor: 1.6, trainerShare: 0.5 }, otherPerMember: 1.0,   // private reformer sessions
      finish: 1.2, hvacSystem: "split", kwhPerM2Year: 80, access: "app", lockersPerPeak: 1.0, cleaningOutsourced: false, rubber: null,
      kit: { studio: [{ item: "reformer", per: 7.5 }, { item: "mat", per: 15 }] },
      staff: (area, h) => [
        { role: "studioManager", group: "G3N1", fte: 0.5, marketFactor: 1.2 },
        { role: "instructor", group: "G4N1", fte: h.fteFor(51 * 1.1 * Math.max(1, Math.ceil(area / 200))), marketFactor: 1.35 },   // every class + 10 % prep; 2nd room above 200 m²
        { role: "cleaning", group: "G5", fte: h.fteFor(area / 150 * 6) },
      ],
    },
    pt: {
      name: "Personal-training micro-studio", priority: 1,
      area: { min: 40, ideal: [60, 180], max: 300 },
      hours: { weekday: 14, weekend: 4 },
      support: { reception: { base: 2, share: 0.02 }, changing: { base: 5, share: 0.06 }, showers: { base: 2, share: 0.03 },
        staff: { base: 0, share: 0 }, storage: { base: 2, share: 0.02 }, technical: { base: 1, share: 0.01 }, circulation: { base: 0, share: 0.06 } },
      mix: { free: 0.6, functional: 0.25, cardio: 0.15 },
      capacityMode: "stations", m2PerPair: 25,                            // A: one trainer–client pair per 25 m² of training floor
      stations: (plan) => Math.max(1, Math.floor(plan.training / 25)),
      get sessionsPerStationWeek() { return this.hours.weekday * 5 + this.hours.weekend * 2; },
      m2PerUser: 12.5, sessionMin: 60, peakHourShare: 0.12, weekendFactor: 0.3, visitsPerWeek: 2,
      utilisation: { conservative: 0.35, base: 0.45, optimistic: 0.55 },  // A: booked share of available hourly slots
      ramp: { months: 12, opening: 0.3 }, churnMonthly: 0.05,
      fee: { granada: 200, malaga: 220, madrid: 320, barcelona: 320 }, feeSrc: "A", feeNote: "pack mensual de 8 sesiones (≈ 25–40 €/sesión); supuesto 3DNA a partir de PT_PRICE", enrolmentFee: 0,
      variableTrainerShare: 0.45,                                          // A: freelance trainers paid 45 % of net session revenue
      pt: { share: 0, sessionsPerMonth: 0, priceFactor: 1, trainerShare: 0.5 }, otherPerMember: 1.0,
      finish: 1.0, hvacSystem: "split", kwhPerM2Year: 70, access: "app", lockersPerPeak: 1.0, cleaningOutsourced: false, rubber: "rubber30",
      kit: {
        free: [{ item: "rack", fixed: 1 }, { item: "bench", fixed: 2 }, { item: "dbRack", fixed: 1 }, { item: "dbSetUrethane", fixed: 1 }, { item: "barbell", fixed: 2 }, { item: "bumperSet70", fixed: 2 }, { item: "cableCross", fixed: 1 }],
        functional: [{ item: "kettlebellSet", fixed: 1 }, { item: "plyoBox", fixed: 2 }, { item: "suspension", fixed: 2 }, { item: "mat", fixed: 4 }],
        cardio: [{ item: "treadmill", fixed: 1 }, { item: "rower", fixed: 1 }, { item: "airbike", fixed: 1 }],
      },
      staff: (area, h) => [
        { role: "studioManager", group: "G3N1", fte: 0.5, marketFactor: 1.2 },
        { role: "cleaning", group: "G5", fte: h.fteFor(area / 150 * 6) },
      ],
    },
  };

  const P = { SOURCES, VAT, INVESTOR, GLOBAL, TRAINING_ZONES, FLOOR, CITIES, WAGES, OPEX, COSTS, CYPE, HVAC, UNCERTAINTY, CONCEPTS };

  // ---- model ----
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
  const net = (gross, stream) => gross / (1 + P.VAT[stream]);
  
  // ---------------------------------------------------------------- concept recommendation
  function suitability(c, area) {
    if (area < c.area.min) return "no";
    if (area >= c.area.ideal[0] && area <= c.area.ideal[1]) return "ideal";
    if (area <= c.area.max) return "viable";
    return "oversized";
  }
  function recommend(area) {
    const keys = Object.keys(P.CONCEPTS);
    const ideal = keys.filter((k) => suitability(P.CONCEPTS[k], area) === "ideal");
    const pool = ideal.length ? ideal : keys.filter((k) => suitability(P.CONCEPTS[k], area) === "viable");
    const centre = (k) => Math.abs(Math.log(area / Math.sqrt(P.CONCEPTS[k].area.ideal[0] * P.CONCEPTS[k].area.ideal[1])));
    const list = pool.length ? pool : keys;
    return list.slice().sort((a, b) => P.CONCEPTS[a].priority - P.CONCEPTS[b].priority || centre(a) - centre(b))[0];
  }
  // concepts worth comparing at this size (ideal or viable), recommended first
  function alternatives(area) {
    const rec = recommend(area);
    return [rec, ...Object.keys(P.CONCEPTS).filter((k) => k !== rec && ["ideal", "viable"].includes(suitability(P.CONCEPTS[k], area)))];
  }
  
  // ---------------------------------------------------------------- space plan (sums to the gross area)
  function spacePlan(area, c) {
    const z = {};
    Object.entries(c.support).forEach(([k, d]) => { const m = d.base + d.share * area; if (m > 0) z[k] = m; });
    let support = sum(Object.values(z));
    // a concept forced onto a floor below its minimum: support zones shrink so that ≥ 35 % still trains
    if (area - support < 0.35 * area) { const k = (0.65 * area) / support; Object.keys(z).forEach((q) => { z[q] *= k; }); support = 0.65 * area; }
    const trainingGross = area - support;
    Object.entries(c.mix).forEach(([k, s]) => { z[k] = trainingGross * s; });
    const zones = Object.entries(z).map(([key, m2]) => ({ key, m2: Math.round(m2) }));
    zones.find((x) => x.key === "circulation").m2 += area - sum(zones, (x) => x.m2);
    const training = sum(zones.filter((x) => P.TRAINING_ZONES.includes(x.key)), (x) => x.m2);
    return { zones, training, byKey: Object.fromEntries(zones.map((x) => [x.key, x.m2])) };
  }
  
  // ---------------------------------------------------------------- equipment (kit densities × tariff prices)
  function equipmentPlan(plan, c) {
    const byItem = {};
    Object.entries(c.kit).forEach(([zone, list]) => {
      const zm2 = plan.byKey[zone] || 0;
      list.forEach(({ item, share, per, fixed }) => {
        const it = ITEMS[item];
        let qty = fixed != null ? fixed : per ? Math.floor(zm2 / per) : Math.floor((zm2 * share) / it.m2);
        if (fixed == null && zm2 > 0 && share >= 0.2 && qty === 0 && it.m2 <= zm2) qty = 1;
        if (qty > 0) { (byItem[item] = byItem[item] || { item, qty: 0, zones: [] }); byItem[item].qty += qty; byItem[item].zones.push(zone); }
      });
    });
    const lines = Object.values(byItem).map((r) => { const it = ITEMS[r.item]; return { ...r, unit: it.src.price, cost: r.qty * it.src.price, kw: r.qty * (it.kw || 0), src: it.src, custom: !!it.custom }; });
    const rubberM2 = sum(plan.zones.filter((z) => P.FLOOR[z.key] === "rubber"), (z) => z.m2);
    if (rubberM2 > 0 && c.rubber) {
      const r = ITEMS[c.rubber];
      lines.push({ item: c.rubber, qty: rubberM2, unit: r.src.price, cost: rubberM2 * r.src.price, kw: 0, src: r.src, perM2: true, custom: false });
    }
    return { lines, catalogue: sum(lines, (l) => l.cost), kw: sum(lines, (l) => l.kw) };
  }
  
  // ---------------------------------------------------------------- capacity & members
  function capacity(plan, c, eq) {
    if (c.capacityMode === "stations") {
      // studios: stations (reformers, trainer–client pairs) × bookable sessions per week
      const stations = c.stations(plan, eq);
      const weeklyVisits = stations * c.sessionsPerStationWeek;
      return { mode: "stations", stations, simultaneous: stations, peak: stations, weeklyVisits, technicalMembers: weeklyVisits / c.visitsPerWeek };
    }
    const simultaneous = Math.floor(plan.training / c.m2PerUser);                  // design maximum at once
    const peak = simultaneous * P.GLOBAL.peakComfort;                              // comfortable peak occupancy
    const weekdayVisits = peak / (c.peakHourShare * c.sessionMin / 60);
    const weeklyVisits = weekdayVisits * (5 + 2 * c.weekendFactor);
    return { mode: "floor", simultaneous, peak, weekdayVisits, weeklyVisits, technicalMembers: weeklyVisits / c.visitsPerWeek };
  }
  function achievable(cap, c, demand) {
    const u = c.utilisation[demand];                                              // share of technical capacity reached at maturity
    const base = cap.technicalMembers * u;
    return { utilisation: u, base, range: [base * (1 - P.GLOBAL.memberBand), base * (1 + P.GLOBAL.memberBand)] };
  }
  // members in month k (1-based): presale share in month 1, S-curve, mature from month = ramp.months
  function membersAt(k, mature, c) {
    if (k >= c.ramp.months) return mature;
    const t = (k - 1) / (c.ramp.months - 1);
    const s = t * t * (3 - 2 * t);
    return mature * (c.ramp.opening + (1 - c.ramp.opening) * s);
  }
  
  // ---------------------------------------------------------------- staffing (collective agreement, SMI floor, city pay factor)
  function staffing(area, c, cap, city) {
    const W = P.WAGES;
    const annual = (grp) => Math.max(W.groups[grp].annual2026, W.smi2026);
    const openWeekH = c.hours.weekday * 5 + c.hours.weekend * 2;
    const staffedWeekH = Math.min(openWeekH, c.staffedHoursWeek ?? openWeekH);
    const fteFor = (weekH) => (weekH * 52) / W.hoursYear;
    const roles = c.staff(area, { openWeekH, staffedWeekH, fteFor, cap }).map((r) => {
      const perFte = annual(r.group) * (r.marketFactor || 1) * city.wageFactor;
      return { ...r, annualPerFte: perFte, monthly: (r.fte * perFte * (1 + W.employerSS)) / 12 };
    });
    return { roles, fte: sum(roles, (r) => r.fte), monthly: sum(roles, (r) => r.monthly), openWeekH };
  }
  
  // ---------------------------------------------------------------- HVAC sizing (design cooling load + outdoor air)
  function hvacSizing(area, cap, eq) {
    const H = P.HVAC;
    const people = cap.peak;
    const airflow = people * H.ventM3hPerPerson;
    const loads = {
      people: (people * H.wPerPersonExercise) / 1000,
      lighting: (area * H.lightingWm2) / 1000,
      equipment: eq.kw * H.equipmentDiversity,
      envelope: (area * H.envelopeWm2) / 1000,
      ventilation: (airflow * 0.34 * H.summerDeltaT * H.latentFactor * (airflow > H.hruThresholdM3h ? 1 - H.hruEfficiency : 1)) / 1000,
    };
    const coolingKw = sum(Object.values(loads));
    // preliminary-estimate band: recompute with the low / high values of the uncertain load inputs
    const alt = (i) => {
      const S = H.sensitivity, af = people * S.ventM3hPerPerson[i];
      return (people * S.wPerPersonExercise[i] + area * H.lightingWm2 + eq.kw * H.equipmentDiversity * 1000 + area * S.envelopeWm2[i]
        + af * 0.34 * H.summerDeltaT * H.latentFactor * (af > H.hruThresholdM3h ? 1 - H.hruEfficiency : 1)) / 1000;
    };
    return { loads, coolingKw, range: [alt(0), alt(1)], wPerM2: (coolingKw * 1000) / area, airflow, recoveryRequired: airflow > H.hruThresholdM3h,
      status: "preliminary estimate", designDocument: coolingKw > H.projectThresholdKw ? "proyecto (RITE art. 15, > 70 kW)" : "memoria técnica (RITE art. 15, 5–70 kW)" };
  }
  
  // ---------------------------------------------------------------- investment: itemised take-off
  function investment(area, plan, eq, cap, c, city, condition, opts = {}) {
    const Y = P.CYPE, K = P.COSTS, Q = K.qty, H = P.HVAC, U = P.UNCERTAINTY, cond = K.condition[condition];
    const reuse = opts.hvacReuse || cond.hvacReuseDefault;
    const system = opts.hvacSystem || c.hvacSystem;
    const items = [];
    const add = (group, key, qty, unit, unitPrice, cls, src, extra = {}) => {
      if (qty > 0 && unitPrice > 0) items.push({ group, key, qty, unit, unitPrice, total: qty * unitPrice, cls, src, ...extra });
    };
    const people = Math.ceil(cap.peak);
    const sv = cond.services;
    // 1 strip-out and base
    if (cond.strip) {
      add("works", "demolPartition", area * Q.demolPartitionPerM2 * cond.strip, "m²", Y.demolPartition, "cype", "CYPE");
      add("works", "floorRemoval", area * cond.strip, "m²", Y.floorRemoval, "cype", "CYPE");
      add("works", "ceilingRemoval", area * cond.strip, "m²", Y.ceilingRemoval, "cype", "CYPE");
      add("works", "skip", Math.ceil((area * cond.strip) / Q.m2PerSkip), "ud", Y.skip, "cype", "CYPE");
    }
    add("works", "screed", area * cond.screed, "m²", Y.screed, "cype", "CYPE");
    // 2 partitions, ceilings, paint (finish level scales the specification)
    const fin = c.finish * cond.finishes;
    add("finishes", "partition", area * Q.partitionPerM2 * fin, "m²", Y.partition, "cype", "CYPE");
    add("finishes", "ceiling", area * Q.ceilingShare * fin, "m²", Y.ceilingAcoustic, "cype", "CYPE");
    add("finishes", "paint", area * Q.paintPerM2 * fin, "m²", Y.paint, "cype", "CYPE");
    // 3 floors by zone (rubber tile material is in the supplier tariff → installation only here)
    const fl = (kind) => sum(plan.zones.filter((z) => P.FLOOR[z.key] === kind), (z) => z.m2);
    if (c.rubber) add("flooring", "rubberLaying", fl("rubber"), "m²", Y.rubberInstalled * 0.25, "assumption", "A", { note: "25 % del precio CYPE de pavimento de caucho instalado (34,72 €/m²) = mano de obra y adhesivo" });
    else add("flooring", "vinylInRubber", fl("rubber"), "m²", Y.sportsVinyl, "cype", "CYPE");
    add("flooring", "studioFloor", fl("sprung"), "m²", Y.studioFloor, "cype", "CYPE");
    add("flooring", "vinylFloor", fl("vinyl"), "m²", Y.sportsVinyl, "cype", "CYPE");
    add("flooring", "tileFloor", fl("tile"), "m²", Y.wetFloor, "cype", "CYPE");
    // 4 changing rooms by fixture count (1 shower per 8 peak users, 1 WC per 25)
    const showers = Math.max(2, Math.ceil(people / Q.peoplePerShower)), wcs = Math.max(2, Math.ceil(people / Q.peoplePerWc));
    // spec level (finish) and reuse of existing services (condition) adjust the unit price; quantities stay whole
    const wetF = c.finish * sv, fx = { note: `precio CYPE × ${(c.finish * sv).toFixed(2)} (nivel de acabado ${c.finish} × aprovechamiento ${sv})` }, sx = { note: `precio CYPE × ${sv} (aprovechamiento de instalaciones existentes)` };
    add("wet", "shower", showers, "ud", (Y.showerTray + Y.showerColumn + Y.drain) * wetF, "cype", "CYPE", fx);
    add("wet", "showerTiles", showers * Q.wallTilePerShower, "m²", Y.wallTile * wetF, "cype", "CYPE", fx);
    add("wet", "wc", wcs, "ud", (Y.wc + Y.wcFrame + Y.wcCistern) * wetF, "cype", "CYPE", fx);
    add("wet", "basin", wcs, "ud", (Y.basin + Y.basinTap) * wetF, "cype", "CYPE", fx);
    add("wet", "cubicle", wcs, "ud", Y.cubicle * wetF, "cype", "CYPE", fx);
    add("wet", "roomServices", 2, "ud", (Y.roomSupply + Y.roomDrainage) * sv, "cype", "CYPE", sx);
    add("wet", "accessible", 1, "ud", Y.accessibleKit, "cype", "CYPE");
    // 5 HVAC: capacity from loads, plant priced per kW, ventilation per m³/h
    const hv = hvacSizing(area, cap, eq);
    const sys = H.systems[system], plantShare = H.reuse[reuse];
    const coolKw = hv.coolingKw * sys.coverage;
    const hu = { unc: 0.20 };
    add("hvac", "hvacPlant", coolKw * plantShare, "kW", sys.cypePerKw, "cype", "CYPE", { ...hu, note: sys.cypeNote });
    add("hvac", "hvacDistribution", coolKw * plantShare, "kW", sys.cypePerKw * sys.installShare, "assumption", "A", hu);
    if (sys.hvlsPerM2) add("hvac", "hvls", plan.training, "m²", sys.hvlsPerM2, "assumption", "A", hu);
    const ventShare = reuse === "full" ? 0.5 : 1;
    const ahu = H.hruRefPrice * Math.pow(hv.airflow / H.hruRefM3h, H.scaleExponent) * (hv.recoveryRequired ? 1 : H.ventNoRecoveryShare);
    add("hvac", "ventilation",
      ventShare, "ud", ahu, "cype", "CYPE", { ...hu, note: `CYPE recuperador 1.200 m³/h = 13.971 €; escalado por la regla 0,7 (supuesto)${hv.recoveryRequired ? "" : "; sin recuperación = 50 % (supuesto)"}` });
    add("hvac", "ventDucts", ventShare, "ud", ahu * H.ventDuctShare, "assumption", "A", hu);
    // 6 electrical + lighting
    add("electrical", "board", Math.ceil(area / Q.m2PerBoard), "ud", Y.board * sv, "cype", "CYPE", sx);
    add("electrical", "circuit1", area * Q.circuit1PerM2, "m", Y.circuit1 * sv, "cype", "CYPE", sx);
    add("electrical", "circuit3", area * Q.circuit3PerM2, "m", Y.circuit3 * sv, "cype", "CYPE", sx);
    add("electrical", "sockets", 1, "ud", area * (Q.circuit1PerM2 * Y.circuit1 + Q.circuit3PerM2 * Y.circuit3) * Q.socketsDataUplift * sv, "assumption", "A");
    if (c.finish >= 1.3) add("electrical", "ledLinear", Math.ceil(area / 28), "ud", Y.ledLinear, "cype", "CYPE");
    else add("electrical", "ledPanel", Math.ceil(area / Q.m2PerLedPanel), "ud", Y.ledPanel, "cype", "CYPE");
    add("electrical", "emergency", Math.ceil(area / Q.m2PerEmergency), "ud", Y.emergencyLight, "cype", "CYPE");
    // 7 DHW by shower count
    add("plumbing", "dhw", Math.max(1, Math.ceil(showers / 3)), "ud", Y.dhwHeatPump * sv, "cype", "CYPE", sx);
    // 8 fire safety
    add("fire", "extinguisher", Math.ceil(area / Q.m2PerExtinguisher), "ud", Y.extinguisher, "cype", "CYPE");
    add("fire", "fireDetection", 1, "ud", Y.firePanel + Math.ceil(area / Q.m2PerDetector) * Y.smokeDetector + 2 * (Y.callPoint + Y.sounder), "cype", "CYPE");
    const direct = sum(items, (i) => i.total);
    add("overheads", "overheads", 1, "ud", direct * K.overheadsProfit, "assumption", "A", { unc: 0.15 });
    const construction = sum(items, (i) => i.total);
    // 9 equipment (supplier tariffs)
    eq.lines.forEach((l) => add("equipment", "eq:" + l.item, l.qty, l.perM2 ? "m²" : "ud", l.unit, l.custom ? "assumption" : "tariff",
      l.custom ? "A" : "TARIFF_2026", { ref: l.custom ? "—" : `${l.src.doc} ref. ${l.src.ref}, p. ${l.src.page}`, note: l.src.note }));
    add("equipment", "delivery", 1, "ud", eq.catalogue * K.deliveryShare, "assumption", "A");
    // 10 reception, lockers, access, AV, signage
    const lockers = Math.ceil((c.lockersPerPeak * people) / 2);
    add("fitout", "reception", 1, "ud", K.receptionDesk[c.finish] || 8000, "assumption", "A");
    add("fitout", "lockers", lockers, "ud", Y.locker2 * (1 + K.overheadsProfit), "cype", "CYPE");
    add("fitout", "benches", Math.ceil(people / 6), "ud", Y.benchM * (1 + K.overheadsProfit), "cype", "CYPE");
    add("fitout", "access", 1, "ud", K.access[c.access], "assumption", "A", { note: "sin presupuesto de proveedor" });
    add("fitout", "av", area, "m²", K.avPerM2 * c.finish, "assumption", "A");
    add("fitout", "signage", 1, "ud", K.signageBase + area * K.signagePerM2, "assumption", "A");
    // 11 fees, taxes, contingency
    add("fees", "fees", 1, "ud", construction * K.feesShare, "official", "FEES_CACOA");
    add("fees", "icio", 1, "ud", construction * city.icio, city.icioSrc === "ICIO_MADRID" ? "assumption" : "official", city.icioSrc);
    add("fees", "licence", 1, "ud", city.licence(area), city.licenceSrc === "A" ? "assumption" : "official", city.licenceSrc);
    add("contingency", "contingency", 1, "ud", sum(items, (i) => i.total) * K.contingency, "assumption", "A", { unc: 0, note: "la propia partida cubre imprevistos; no se le añade banda" });
    items.forEach((i) => { const u = i.unc != null ? i.unc : U[i.cls]; i.band = u; i.low = i.total * (1 - u); i.high = i.total * (1 + u); });
    const capex = sum(items, (i) => i.total), low = sum(items, (i) => i.low), high = sum(items, (i) => i.high);
    const byClass = {}, byGroup = {};
    items.forEach((i) => { byClass[i.cls] = (byClass[i.cls] || 0) + i.total; byGroup[i.group] = (byGroup[i.group] || 0) + i.total; });
    const headline = { central: capex, low, high, note: "central estimate; low–high = source-based bands added in the same direction" };
    return { items, capex, low, high, headline, spread: high / low, withinTarget: high / low <= 1.25 + 1e-9, byClass, byGroup, direct, construction, showers, wcs, hvac: hv, hvacSystem: system, reuse };
  }
  
  // ---------------------------------------------------------------- revenue streams (IVA-included prices → net + IVA)
  function revenueAt(mem, newMembers, ctx) {
    const { c, city } = ctx;
    const gross = {
      membership: mem * ctx.fee,
      enrolment: newMembers * c.enrolmentFee,
      pt: mem * c.pt.share * c.pt.sessionsPerMonth * city.ptPrice * c.pt.priceFactor,
      other: mem * c.otherPerMember,
    };
    const n = Object.fromEntries(Object.entries(gross).map(([k, v]) => [k, net(v, k)]));
    const grossTotal = sum(Object.values(gross)), netTotal = sum(Object.values(n));
    return { gross, net: n, grossTotal, netTotal, iva: grossTotal - netTotal };
  }
  function opexAt(mem, rev, k, ctx) {
    const { area, c, city, staff, eq, inv } = ctx;
    const O = P.OPEX;
    const visits = (mem * c.visitsPerWeek * 52) / 12;
    return {
      payroll: staff.monthly,
      rent: area * city.rent,
      energy: ((area * c.kwhPerM2Year) / 12) * O.kwhPrice,
      water: visits * O.waterPerVisit,
      cleaning: c.cleaningOutsourced ? area * O.cleaningPerM2 : 0,
      maintenance: (eq.catalogue * O.equipmentMaintYear + inv.construction * O.buildingMaintYear) / 12,
      insurance: O.insuranceBase + area * O.insurancePerM2,
      software: O.softwareBase + mem * O.softwarePerMember,
      marketing: rev.netTotal * O.marketingShare + (k <= O.launchMonths ? O.launchMarketingMonthly * c.finish : 0),
      trainers: rev.net.pt * c.pt.trainerShare + rev.net.membership * (c.variableTrainerShare || 0),
      costOfSales: rev.net.other * O.otherCogs,
      paymentFees: rev.grossTotal * O.paymentFeeShare,
      other: O.otherBase + rev.netTotal * O.otherShare,
    };
  }
  function monthAt(k, ctx) {
    const { c, mature } = ctx;
    const mem = membersAt(k, mature, c), prev = k > 1 ? membersAt(k - 1, mature, c) : 0;
    const growth = Math.max(0, mem - prev), churned = prev * c.churnMonthly;
    const rev = revenueAt(mem, growth + churned, ctx);
    const costs = opexAt(mem, rev, k, ctx);
    const opex = sum(Object.values(costs));
    return { month: k, members: mem, newMembers: growth + churned, growth, churned, rev, costs, opex, gross: rev.grossTotal, net: rev.netTotal, ebitda: rev.netTotal - opex };
  }
  
  // ---------------------------------------------------------------- investor view: tax, replacement capex, financing
  // Three paybacks on the same monthly EBITDA:
  //  operational = −upfront + Σ EBITDA (pre-tax, no replacement, no debt)
  //  project     = −upfront + Σ (EBITDA − corporate tax − replacement capex), unlevered (no interest shield)
  //  equity      = −(upfront − loan) + Σ (EBITDA − tax − replacement − debt service), interest deductible
  function investorView(a, o = {}) {
    const I = { ...P.INVESTOR, ...o }, inv = a.inv;
    const eqTariff = sum(a.eq.lines, (l) => l.cost);
    const eqBase = sum(inv.items.filter((i) => i.group === "equipment"), (i) => i.total);
    const consBase = inv.capex - eqBase;
    const dep = (k) => (k <= I.depreciationYears.construction * 12 ? consBase / (I.depreciationYears.construction * 12) : 0)
      + (k <= I.depreciationYears.equipment * 12 ? eqBase / (I.depreciationYears.equipment * 12) : 0);
    const loan = inv.capex * I.debtShare, r = I.rate / 12;
    const pay = loan > 0 ? (loan * r) / (1 - Math.pow(1 + r, -I.termMonths)) : 0;
    const ebitdaAt = (k) => (k <= a.months.length ? a.months[k - 1].ebitda : a.steady.ebitda);
    let bal = loan, cumOp = -a.upfront, cumProj = -a.upfront, cumEq = -(a.upfront - loan);
    let lossU = 0, lossL = 0, yearU = 0, yearL = 0, dueU = 0, dueL = 0;
    const rows = [], pb = { operational: null, project: null, equity: null };
    for (let k = 1; k <= I.horizonMonths; k++) {
      const e = ebitdaAt(k);
      const interest = bal > 1e-9 ? bal * r : 0, principal = bal > 1e-9 ? Math.min(bal, pay - interest) : 0;
      bal -= principal;
      const repl = k > (I.replacementStartYear - 1) * 12 ? (eqTariff * I.replacementShareYear) / 12 : 0;
      yearU += e - dep(k) - repl; yearL += e - dep(k) - repl - interest;   // replacement expensed for tax (simplification)
      // corporate tax: annual base with loss carry-forward, paid in month 7 of the following year
      let taxU = 0, taxL = 0;
      if (k % 12 === 7 && k > 12) { taxU = dueU; taxL = dueL; dueU = dueL = 0; }
      if (k % 12 === 0) {
        const bu = yearU - lossU, bl = yearL - lossL;
        if (bu > 0) { dueU = bu * I.taxRate; lossU = 0; } else lossU = -bu;
        if (bl > 0) { dueL = bl * I.taxRate; lossL = 0; } else lossL = -bl;
        yearU = yearL = 0;
      }
      cumOp += e; cumProj += e - taxU - repl; cumEq += e - taxL - repl - interest - principal;
      rows.push({ month: k, ebitda: e, taxU, taxL, repl, interest, principal, cumOp, cumProj, cumEq });
      if (pb.operational == null && cumOp >= 0) pb.operational = k;
      if (pb.project == null && cumProj >= 0) pb.project = k;
      if (pb.equity == null && cumEq >= 0) pb.equity = k;
    }
    return { assumptions: I, loan, equity: a.upfront - loan, monthlyDebtService: pay, rows, payback: pb };
  }
  
  // ---------------------------------------------------------------- full analysis
  function analyze(input) {
    const area = clamp(Number(input.area) || 500, 40, 5000);
    const key = input.concept && P.CONCEPTS[input.concept] ? input.concept : recommend(area);
    const c = P.CONCEPTS[key];
    const cityKey = P.CITIES[input.city] ? input.city : "malaga";
    const city = { key: cityKey, ...P.CITIES[cityKey] };
    const condition = input.condition || "commercial";
    const demand = input.demand || "base";
    const plan = spacePlan(area, c);
    const eq = equipmentPlan(plan, c);
    const cap = capacity(plan, c, eq);
    const staff = staffing(area, c, cap, city);
    const inv = investment(area, plan, eq, cap, c, city, condition, { hvacReuse: input.hvacReuse, hvacSystem: input.hvacSystem });
    const ach = achievable(cap, c, demand);
    const fee = c.fee[cityKey];
    const ctx = { area, c, city, staff, eq, inv, fee, mature: input._forceMature != null ? input._forceMature : ach.base };
    const preOpening = { payroll: staff.monthly * P.GLOBAL.preOpeningPayrollMonths, marketing: P.OPEX.launchMarketingPreOpening * c.finish, deposit: area * city.rent * P.GLOBAL.depositMonths };
    const upfront = inv.capex + preOpening.payroll + preOpening.marketing + preOpening.deposit;
    // monthly projection: at least 24 months, extended until cumulative cash ≥ 0 (max 120 months)
    const months = []; let cum = -upfront, paybackMonth = null;
    for (let k = 1; k <= 120; k++) {
      const m = monthAt(k, ctx); cum += m.ebitda; m.cumulative = cum; months.push(m);
      if (paybackMonth == null && cum >= 0) paybackMonth = k;
      if (k >= 24 && paybackMonth != null) break;
    }
    const steady = monthAt(c.ramp.months + 1, ctx);
    const firstPositive = (months.find((m) => m.ebitda > 0) || {}).month || null;
    // break-even members in the steady month (every line is linear in members)
    const a = monthAt(c.ramp.months + 1, { ...ctx, mature: 1000 }), b = monthAt(c.ramp.months + 1, { ...ctx, mature: 0 });
    const perMember = (a.ebitda - b.ebitda) / 1000, fixed = -b.ebitda;
    const breakEven = perMember > 0 ? Math.ceil(fixed / perMember) : null;
    const simplePaybackYears = steady.ebitda > 0 ? upfront / (steady.ebitda * 12) : null;
    const demandBasis = {
      technical: { value: cap.technicalMembers, label: "technical capacity: what the floor could serve; calculated, NOT market demand" },
      achievable: { value: ach.base, label: `planning assumption: ${Math.round(ach.utilisation * 100)} % of technical capacity (${demand} scenario), calibrated on operator benchmarks; NOT verified local demand` },
    };
    return { input: { area, key, city: cityKey, condition, demand }, c, city, fee, plan, eq, cap, ach, demandBasis, staff, inv, preOpening, upfront,
      months, steady, firstPositive, breakEven, perMember, fixed, paybackMonth, cashPaybackYears: paybackMonth ? paybackMonth / 12 : null, simplePaybackYears };
  }
  // ======================================================================
  // CALCULATOR — fields, live results, one report structure (page, PDF, print)
  // ======================================================================
  const ORDER = ["pt", "pilates", "boutique", "functional", "auto24", "budget", "premium"];
  const CITY_KEYS = ["granada", "malaga", "madrid", "barcelona"];
  // ONE reference baseline for every visitor, whatever the language or location: the complete data set of a
  // mid-cost Spanish city (rent, published fees, ICIO, licence, PT price, no regional pay premium), with national
  // CYPE prices, national wage tables, national electricity price and Spanish VAT. Never mixed with other cities;
  // change REFERENCE (or the CITIES table) to update the baseline.
  const REFERENCE = "malaga";
  const FIELDS = [
    { key: "area", param: "m2", type: "number", min: 40, max: 5000, decimals: 0 },
    { key: "concept", param: "c", type: "choice", options: ["auto", ...ORDER] },
    { key: "condition", param: "cond", type: "choice", options: ["shell", "commercial", "exgym"] },
    { key: "demand", param: "d", type: "choice", options: ["conservative", "base", "optimistic"] },
    { key: "hvac", param: "hvac", type: "choice", options: ["auto", "none", "partial", "full"] },
  ];
  // only the floor area is required; every other input is a labelled, editable default
  const DEFAULTS = { area: 500, concept: "auto", condition: "commercial", demand: "base", hvac: "auto" };
  const MODEL_VERSION = "3DNA-F3 · 2026-10-15";

  // ---------------- recommendation: transparent ordering, no weighted score ----------------
  // Indicative payback classes (cash-flow payback, operational): informative, not investment guarantees.
  const PAYBACK_CLASSES = [["attractive", 60], ["moderate", 84], ["long", 120]];
  function paybackClass(a) {
    if (!(a.steady.ebitda > 0)) return "notViable";
    if (a.paybackMonth == null) return "beyond";
    return PAYBACK_CLASSES.find(([, m]) => a.paybackMonth <= m)[0];
  }
  const CLASS_ORDER = ["attractive", "moderate", "long", "beyond", "notViable"];
  // reliability of the price data behind a concept: published fee for the city? equipment in the verified tariffs?
  function reliability(k, city) {
    const fee = !(FEE_ASSUMED[k] || []).includes(city);
    const eq = !Object.values(P.CONCEPTS[k].kit).some((list) => list.some((x) => ITEMS[x.item].custom));
    return { fee, eq, level: fee && eq ? "high" : fee || eq ? "medium" : "low" };
  }
  const REL_ORDER = ["high", "medium", "low"];
  // tiers: 0 viable (positive EBITDA, payback ≤ 10 years) with verified or partly verified prices;
  // 1 viable but key prices unverified; 2 positive EBITDA, payback beyond 10 years; 3 negative EBITDA
  function assess(k, a, city) {
    const cls = paybackClass(a), rel = reliability(k, city), suit = suitability(P.CONCEPTS[k], a.input.area);
    const tier = cls === "notViable" ? 3 : cls === "beyond" ? 2 : rel.level === "low" ? 1 : 0;
    return { k, a, cls, rel, suit, tier };
  }
  // the order of the criteria IS the method: each one only decides when all previous ones are equal
  const CRITERIA = [
    ["tier", (x) => x.tier],
    ["band", (x) => (x.cls === "attractive" || x.cls === "moderate" ? 0 : 1)],   // within 7 years before 7–10 years
    ["fit", (x) => (x.suit === "ideal" ? 0 : 1)],
    ["reliability", (x) => REL_ORDER.indexOf(x.rel.level)],
    ["class", (x) => CLASS_ORDER.indexOf(x.cls)],                               // attractive before moderate
    ["investment", (x) => x.a.inv.capex],
  ];
  const rankCmp = (x, y) => { for (const [, g] of CRITERIA) { const d = g(x) - g(y); if (d) return d; } return 0; };
  const decidedBy = (x, y) => (CRITERIA.find(([, g]) => g(x) !== g(y)) || ["investment"])[0];
  function candidates(val) {
    const base = { area: val.area, city: REFERENCE, condition: val.condition, demand: val.demand, hvacReuse: val.hvac === "auto" ? undefined : val.hvac };
    return ORDER.filter((k) => ["ideal", "viable"].includes(suitability(P.CONCEPTS[k], val.area)))
      .map((k) => assess(k, analyze({ ...base, concept: k }), REFERENCE)).sort(rankCmp);
  }
  // where no suitable concept works: the nearest floor areas (inside each concept's size range) at which one does
  function viableElsewhere(val) {
    const out = [];
    ORDER.forEach((k) => {
      const c = P.CONCEPTS[k], pts = [];
      for (let i = 0; i <= 24; i++) pts.push(Math.round(c.area.min * Math.pow(c.area.max / c.area.min, i / 24) / 10) * 10);
      const ok = [...new Set(pts)].map((area) => assess(k, analyze({ area, concept: k, city: REFERENCE, condition: val.condition, demand: val.demand }), REFERENCE)).filter((x) => x.tier === 0);
      if (ok.length) out.push(ok.sort((x, y) => Math.abs(Math.log(x.a.input.area / val.area)) - Math.abs(Math.log(y.a.input.area / val.area)))[0]);
    });
    return out.sort((x, y) => Math.abs(Math.log(x.a.input.area / val.area)) - Math.abs(Math.log(y.a.input.area / val.area))).slice(0, 3);
  }

  // one calculation for every figure on the page, in the PDF and in the print sheet
  function run(v) {
    const val = { ...DEFAULTS, ...(v || {}) };
    delete val.city;                                   // never an input: the reference baseline applies to everyone
    const cands = candidates(val);
    let a, status, pick;
    if (val.concept !== "auto") {
      pick = cands.find((x) => x.k === val.concept) || assess(val.concept, analyze({ area: val.area, concept: val.concept, city: REFERENCE, condition: val.condition, demand: val.demand, hvacReuse: val.hvac === "auto" ? undefined : val.hvac }), REFERENCE);
      status = ["ideal", "viable"].includes(pick.suit) ? "chosen" : "outOfRange";
    } else if (cands.length && cands[0].tier <= 1) {
      pick = cands[0]; status = pick.tier === 0 ? "recommended" : "provisional";
    } else {
      pick = cands[0] || assess(recommend(val.area), analyze({ area: val.area, city: REFERENCE, condition: val.condition, demand: val.demand }), REFERENCE);
      status = "notViable";
    }
    a = pick.a;
    a.values = val;
    a.rank = { status, pick, cands, next: cands.find((x) => x !== pick) || null, elsewhere: status === "notViable" ? viableElsewhere(val) : [] };
    a.investor = investorView(a);
    a.scenarios = ["conservative", "base", "optimistic"].map((d) => {
      const s = d === a.input.demand ? a : analyze({ ...a.input, concept: a.input.key, demand: d, hvacReuse: val.hvac === "auto" ? undefined : val.hvac });
      return { demand: d, a: s, iv: d === a.input.demand ? a.investor : investorView(s) };
    });
    return a;
  }
  function compute(v) {
    const a = run(v), s = a.steady;
    return {
      invCentral: a.inv.headline.central, invLow: a.inv.low, invHigh: a.inv.high,
      technical: a.cap.technicalMembers, members: a.ach.base,
      gross: s.gross, net: s.net, ebitda: s.ebitda, ebitdaAnnual: s.ebitda * 12,
      breakEven: a.breakEven, paybackMonths: a.paybackMonth, loss: s.ebitda < 0, _an: a,
    };
  }

  // ---------------- text helpers ----------------
  const fill = (s, vars) => String(s == null ? "" : s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
  const months = (n, t, f) => (n == null ? t.never : fill(t.u.monthsN, { n: f.int(n), y: f.num1(n / 12) }));
  function itemLabel(it, a, t, f) {
    if (it.key.startsWith("eq:")) return t.eq[it.key.slice(3)] || ITEMS[it.key.slice(3)].src.name;
    const H = P.HVAC, sys = H.systems[a.inv.hvacSystem];
    return fill(t.inv[it.key], {
      sys: t.hvacSystems[a.inv.hvacSystem], kw: f.int(a.inv.hvac.coolingKw * sys.coverage), pct: f.int(sys.installShare * 100), m3h: f.int(a.inv.hvac.airflow),
      icio: f.num2(a.city.icio * 100), fees: f.num2(P.COSTS.feesShare * 100),
    });
  }
  // published fees (FEE_* sources) by concept and city; the rest are 3DNA assumptions (see each concept's feeNote)
  const FEE_ASSUMED = { premium: ["granada", "malaga"], boutique: ["granada", "malaga"], auto24: ["granada", "malaga", "barcelona"], pilates: CITY_KEYS, pt: CITY_KEYS };
  const feeVerified = (k, city) => !(FEE_ASSUMED[k] || []).includes(city);
  const srcRef = (it) => (it.ref ? it.ref : it.src === "TARIFF_2026" ? "" : it.src === "A" ? "" : it.src);

  // ---------------- project summary card (build-time first paint and live paint use the same HTML) ----------------
  const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function reasons(a, t, f) {
    const R = t.gp.reasons, x = a.rank.pick, c = a.c, out = [];
    if (a.steady.ebitda > 0) out.push(fill(R.ebitda, { v: f.eur(a.steady.ebitda) }));
    else out.push(fill(R.loss, { v: f.eur(a.steady.ebitda) }));
    if (x.cls !== "notViable") out.push(fill(R[x.cls], { m: a.paybackMonth ? f.int(a.paybackMonth) : "—" }));
    out.push(fill(x.suit === "ideal" ? R.ideal : x.suit === "viable" ? R.viable : R.outside, { lo: f.int(c.area.ideal[0]), hi: f.int(c.area.ideal[1]), min: f.int(c.area.min), max: f.int(c.area.max) }));
    out.push(R.rel[x.rel.level]);
    out.push(fill(R.investment, { v: f.eur(a.inv.capex), lo: f.keur(a.inv.low), hi: f.keur(a.inv.high) }));
    out.push(fill(R.operations, { fte: f.num1(a.staff.fte), h: f.int(a.staff.openWeekH) }));
    const nx = a.rank.next;
    if (nx && (a.rank.status === "recommended" || a.rank.status === "provisional")) out.push(fill(R.ahead, { c: t.concepts[nx.k].name, why: R.criteria[decidedBy(x, nx)] }));
    return out;
  }
  function summaryHtml(a, t, f, contact) {
    const G = t.gp, s = a.steady, rk = a.rank, x = rk.pick, k = a.input.key, name = t.concepts[k].name;
    const why = reasons(a, t, f);
    const others = rk.status === "notViable" ? [] : rk.cands.filter((y) => y !== x).slice(0, 2);
    const metric = (label, value, note, negative) => `<div class="gp-metric"><dt>${esc(label)}</dt><dd${negative ? ' class="is-neg"' : ""}>${esc(value)}</dd>${note ? `<p>${esc(note)}</p>` : ""}</div>`;
    const alt = (y) => `<li><button type="button" class="gp-alt" data-gp-pick="${y.k}"><span class="gp-alt__name">${esc(t.concepts[y.k].name)}</span><span class="gp-alt__meta gp-cls--${y.cls}">${esc(G.classes[y.cls])}${y.a.paybackMonth ? ` · ${esc(fill(t.u.monthsShort, { n: f.int(y.a.paybackMonth) }))}` : ""}</span></button></li>`;
    const lead = rk.status === "notViable" ? fill(G.notViable.closest, { c: name })
      : rk.status === "outOfRange" ? fill(t.sec.recs.texts.outOfRange, { c: name, min: f.int(a.c.area.min), max: f.int(a.c.area.max) })
      : fill(x.suit === "ideal" ? G.reasons.ideal : x.suit === "viable" ? G.reasons.viable : G.reasons.outside, { lo: f.int(a.c.area.ideal[0]), hi: f.int(a.c.area.ideal[1]), min: f.int(a.c.area.min), max: f.int(a.c.area.max) });
    return `<div class="gp-card__body">
  <div class="gp-top"><p class="gp-status gp-status--${rk.status}">${esc(G.status[rk.status])}</p><p class="gp-class gp-cls--${x.cls}" title="${esc(G.classNotes[x.cls])}"><span>${esc(G.classes[x.cls])}</span></p></div>
  <h3 class="gp-name">${esc(name)}</h3>
  ${rk.status === "notViable" ? "" : `<p class="gp-why">${esc(lead)}</p>`}
  ${rk.status === "provisional" ? `<p class="gp-warn">${esc(G.provisional)}</p>` : ""}
  ${rk.status === "notViable" ? `<div class="gp-warn gp-warn--alert"><p>${esc(fill(rk.cands.some((y) => y.tier === 2) ? G.notViable.beyond : G.notViable.text, { a: `${f.int(a.input.area)} m²` }))}</p>${rk.elsewhere.length ? `<p>${esc(G.notViable.elsewhere)}</p><ul class="gp-list">${rk.elsewhere.slice(0, 2).map((y) => `<li><button type="button" class="gp-alt" data-gp-area="${y.a.input.area}" data-gp-pick="${y.k}"><span class="gp-alt__name">${esc(fill(G.notViable.fromArea, { c: t.concepts[y.k].name, a: f.int(y.a.input.area) }))}</span><span class="gp-alt__meta gp-cls--${y.cls}">${esc(G.classes[y.cls])} · ${esc(fill(t.u.monthsShort, { n: f.int(y.a.paybackMonth) }))}</span></button></li>`).join("")}</ul>` : `<p>${esc(G.notViable.none)}</p>`}<p class="gp-warn__note">${esc(lead)}</p></div>` : ""}
  <div class="gp-hero"><p class="gp-hero__label">${esc(t.cards.investment)}</p><p class="gp-hero__value">${esc(f.eur(a.inv.headline.central))}</p><p class="gp-hero__note">${esc(fill(t.cards.range, { lo: f.keur(a.inv.low), hi: f.keur(a.inv.high) }))}</p></div>
  <dl class="gp-metrics">
    ${metric(t.cards.ebitda, f.eur(s.ebitda), fill(t.cards.ebitdaNote, { m: a.c.ramp.months + 1 }), s.ebitda < 0)}
    ${metric(t.cards.payback, a.paybackMonth ? fill(t.u.monthsShort, { n: f.int(a.paybackMonth) }) : "—", a.simplePaybackYears != null ? fill(t.cards.paybackNote, { y: f.num1(a.simplePaybackYears) }) : t.cards.paybackNoteNa)}
    ${metric(t.cards.members, f.int(a.ach.base), fill(t.cards.membersNote, { n: f.int(a.cap.technicalMembers) }))}
  </dl>
  ${others.length ? `<div class="gp-alts"><p class="gp-alts__h">${esc(G.altsAtArea)}</p><ul class="gp-list">${others.map(alt).join("")}</ul></div>` : ""}
</div>`;
  }


  // ---------------- one report structure: page, PDF and print ----------------
  function sections(a, t, f) {
    const S = [], s = a.steady, inv = a.inv, c = a.c, area = a.input.area;
    const m2 = (x) => `${f.int(x)} m²`;
    const neg = (x) => typeof x === "number" && x < 0;
    const money = (x) => ({ text: f.eur(x), negative: neg(x) });
    const def = (field) => (a.values[field] === DEFAULTS[field] ? "def" : "in");
    const T = t.sec;

    // 1 summary
    S.push({ id: "summary", title: T.summary.title, intro: fill(T.summary.intro, { a: m2(area), c: t.concepts[a.input.key].name }), rows: [
      { label: T.summary.area, value: m2(area), tag: "in" },
      { label: T.summary.concept, value: t.concepts[a.input.key].name, tag: a.values.concept === "auto" ? "est" : "in" },
      { label: T.summary.condition, value: t.conditions[a.input.condition], tag: def("condition") },
      { label: T.summary.demand, value: t.demands[a.input.demand], tag: def("demand") },
      { label: T.summary.investment, value: f.eur(inv.headline.central), tag: "est", strong: true },
      { label: T.summary.range, value: `${f.eur(inv.low)} – ${f.eur(inv.high)}`, tag: "est", note: fill(T.summary.rangeNote, { x: f.num2(inv.spread) }) },
      { label: T.summary.technical, value: f.int(a.cap.technicalMembers), tag: "max" },
      { label: T.summary.members, value: `${f.int(a.ach.base)} (${f.int(a.ach.range[0])}–${f.int(a.ach.range[1])})`, tag: "asm", strong: true },
      { label: T.summary.gross, value: f.eur(s.gross), tag: "scn" },
      { label: T.summary.net, value: f.eur(s.net), tag: "scn" },
      { label: T.summary.ebitda, value: f.eur(s.ebitda), tag: "scn", strong: true, negative: neg(s.ebitda) },
      { label: T.summary.breakEven, value: a.breakEven == null ? t.na : f.int(a.breakEven), tag: "est" },
      { label: T.summary.payback, value: months(a.paybackMonth, t, f), tag: "scn", strong: true },
      { label: T.summary.simple, value: a.simplePaybackYears == null ? t.na : `${f.num1(a.simplePaybackYears)} ${t.u.years}`, tag: "scn" },
    ], note: T.summary.note });

    // 2 concept: the selected concept, then every concept at this size (same city / condition / demand)
    const G = t.gp, rk = a.rank;
    const alts = ORDER.map((k) => {
      const suit = suitability(P.CONCEPTS[k], area);
      const x = rk.cands.find((y) => y.k === k);
      return { k, suit, r: x ? x.a : k === a.input.key ? a : null, x };
    });
    S.push({ id: "concept", title: G.sec.concept.title, intro: t.concepts[a.input.key].desc, rows: [
      { label: G.sec.concept.status, value: G.status[rk.status], tag: a.values.concept === "auto" ? "est" : "in", strong: true },
      { label: G.sec.concept.fit, value: `${t.suits[rk.pick.suit]} · ${f.int(c.area.ideal[0])}–${f.int(c.area.ideal[1])} m²`, tag: "asm" },
      { label: G.sec.concept.payback, value: G.classes[rk.pick.cls], tag: "scn" },
      { label: G.sec.concept.reliability, value: G.rel[rk.pick.rel.level], tag: rk.pick.rel.level === "high" ? "ver" : "asm" },
      { label: G.sec.concept.hours, value: `${f.int(a.staff.openWeekH)} h`, tag: "asm" },
      { label: G.sec.concept.staff, value: `${f.num1(a.staff.fte)} FTE`, tag: "est" },
    ], bullets: reasons(a, t, f).map((r) => ({ level: "zone", label: G.sec.concept.why, text: r })), note: G.method });
    S.push({ id: "concepts", title: T.concept.title, intro: fill(T.concept.intro, { c: t.concepts[a.input.key].name }),
      table: { columns: T.concept.cols, widths: [0.27, 0.15, 0.14, 0.15, 0.15, 0.14], align: ["l", "r", "l", "r", "r", "r"], rows: alts.map(({ k, suit, r }) => [
        { text: k === a.input.key ? `${t.concepts[k].name} ★` : t.concepts[k].name, strong: k === a.input.key },
        `${f.int(P.CONCEPTS[k].area.ideal[0])}–${f.int(P.CONCEPTS[k].area.ideal[1])} m²`,
        t.suits[suit],
        r ? f.keur(r.inv.capex) : "—",
        r ? money(r.steady.ebitda) : "—",
        r ? (r.paybackMonth ? fill(t.u.monthsShort, { n: f.int(r.paybackMonth) }) : t.never) : "—",
      ]) },
      bullets: alts.filter((x) => ["ideal", "viable"].includes(x.suit)).map((x) => ({ level: x.k === a.input.key ? "ok" : "zone", label: t.concepts[x.k].name, text: t.concepts[x.k].desc })),
      note: T.concept.note });
    // ranked comparison of the suitable concepts (the recommendation, criterion by criterion)
    S.push({ id: "compare", title: G.sec.compare.title, intro: G.sec.compare.intro,
      table: { columns: G.sec.compare.cols, widths: [0.05, 0.25, 0.12, 0.14, 0.18, 0.13, 0.13], align: ["l", "l", "l", "r", "l", "r", "l"], rows: rk.cands.map((y, i) => [
        String(i + 1),
        { text: t.concepts[y.k].name + (y.k === a.input.key ? " ★" : ""), strong: y.k === a.input.key },
        t.suits[y.suit],
        money(y.a.steady.ebitda),
        `${G.classes[y.cls]}${y.a.paybackMonth ? ` · ${fill(t.u.monthsShort, { n: f.int(y.a.paybackMonth) })}` : ""}`,
        f.keur(y.a.inv.capex),
        G.rel[y.rel.level],
      ]) },
      bullets: [
        ...CRITERIA.map(([key], i) => ({ level: "zone", label: `${i + 1}`, text: G.sec.compare.criteria[key] })),
        ...(alts.some((x) => !["ideal", "viable"].includes(x.suit)) ? [{ level: "warn", label: G.sec.compare.unsuitableLabel, text: alts.filter((x) => !["ideal", "viable"].includes(x.suit)).map((x) => `${t.concepts[x.k].name} (${t.suits[x.suit]})`).join(", ") }] : []),
      ],
      note: G.sec.compare.note });

    // 3 space
    S.push({ id: "space", title: T.space.title, intro: T.space.intro,
      table: { columns: T.space.cols, widths: [0.5, 0.25, 0.25], rows: [
        ...a.plan.zones.map((z) => [t.zones[z.key] || z.key, f.int(z.m2), f.pct(z.m2 / area)]),
        [{ text: T.space.total, strong: true }, { text: f.int(area), strong: true }, { text: f.pct(1), strong: true }],
      ] },
      rows: [{ label: T.space.training, value: m2(a.plan.training), tag: "est", note: f.pct(a.plan.training / area) }],
      chart: { items: a.plan.zones.map((z) => ({ label: t.zones[z.key] || z.key, value: z.m2, display: m2(z.m2), tone: P.TRAINING_ZONES.includes(z.key) ? "ink" : "accent" })) },
      note: T.space.note });

    // 4 equipment (verified supplier tariffs)
    const eqItems = inv.items.filter((i) => i.group === "equipment");
    S.push({ id: "equipment", title: T.equipment.title, intro: T.equipment.intro,
      table: { columns: T.equipment.cols, widths: [0.34, 0.2, 0.1, 0.12, 0.12, 0.12], align: ["l", "l", "r", "r", "r", "l"], rows: [
        ...eqItems.map((i) => [itemLabel(i, a, t, f), i.ref || "—", i.unit === "m²" ? m2(i.qty) : f.int(i.qty), f.eur2(i.unitPrice), f.eur(i.total), t.classes[i.cls]]),
        [{ text: T.equipment.total, strong: true }, "", "", "", { text: f.eur(sum(eqItems, (i) => i.total)), strong: true }, ""],
      ] },
      note: T.equipment.note });

    // 5 capacity and demand
    const cap = a.cap;
    S.push({ id: "capacity", title: T.capacity.title, intro: T.capacity.intro, rows: [
      { label: T.capacity.training, value: m2(a.plan.training), tag: "est" },
      ...(cap.mode === "stations" ? [
        { label: T.capacity.stations, value: f.int(cap.stations), tag: "est" },
        { label: T.capacity.sessions, value: f.int(c.sessionsPerStationWeek), tag: "asm" },
      ] : [
        { label: T.capacity.perUser, value: `${f.num1(c.m2PerUser)} m²`, tag: "asm" },
        { label: T.capacity.simultaneous, value: f.int(cap.simultaneous), tag: "max" },
        { label: T.capacity.peak, value: f.int(cap.peak), tag: "est" },
      ]),
      { label: T.capacity.weekly, value: f.int(cap.weeklyVisits), tag: "max" },
      { label: T.capacity.visits, value: f.num1(c.visitsPerWeek), tag: "asm" },
      { label: T.capacity.technical, value: f.int(cap.technicalMembers), tag: "max", strong: true },
      { label: T.capacity.utilisation, value: f.pct(a.ach.utilisation), tag: "asm" },
      { label: T.capacity.members, value: `${f.int(a.ach.base)} (${f.int(a.ach.range[0])}–${f.int(a.ach.range[1])})`, tag: "asm", strong: true },
      { label: T.capacity.ramp, value: fill(T.capacity.rampValue, { p: f.pct(c.ramp.opening), m: c.ramp.months }), tag: "asm" },
      { label: T.capacity.churn, value: f.pct(c.churnMonthly), tag: "asm" },
    ], note: T.capacity.note });

    // 6 staff
    const st = a.staff;
    S.push({ id: "staff", title: T.staff.title, intro: fill(T.staff.intro, { h: f.int(st.openWeekH) }),
      table: { columns: T.staff.cols, widths: [0.34, 0.12, 0.1, 0.22, 0.22], rows: [
        ...st.roles.map((r) => [t.roles[r.role] || r.role, r.group, f.num1(r.fte), f.eur(r.annualPerFte), f.eur(r.monthly)]),
        [{ text: T.staff.total, strong: true }, "", { text: f.num1(st.fte), strong: true }, "", { text: f.eur(st.monthly), strong: true }],
      ] }, note: T.staff.note });

    // 7 investment: central estimate first, range second, every line with its source class
    const groups = Object.keys(inv.byGroup);
    S.push({ id: "investment", title: T.investment.title, intro: T.investment.intro, rows: [
      { label: T.investment.central, value: f.eur(inv.headline.central), tag: "est", strong: true },
      { label: T.investment.range, value: `${f.eur(inv.low)} – ${f.eur(inv.high)}`, tag: "est", note: inv.withinTarget ? T.investment.inTarget : T.investment.outTarget },
      { label: T.investment.perM2, value: f.eur(inv.capex / area), tag: "est" },
      ...["tariff", "cype", "official", "assumption"].filter((k) => inv.byClass[k]).map((k) => ({ label: t.classes[k], value: `${f.eur(inv.byClass[k])} · ${f.pct(inv.byClass[k] / inv.capex)}`, tag: k === "tariff" || k === "official" ? "ver" : k === "cype" ? "est" : "asm" })),
    ],
    table: { columns: T.investment.groupCols, widths: [0.5, 0.25, 0.25], rows: [
      ...groups.map((g) => [t.groups[g] || g, f.eur(inv.byGroup[g]), f.pct(inv.byGroup[g] / inv.capex)]),
      [{ text: T.investment.total, strong: true }, { text: f.eur(inv.capex), strong: true }, { text: f.pct(1), strong: true }],
    ] }, note: T.investment.note });
    S.push({ id: "items", title: T.items.title, intro: T.items.intro,
      table: { columns: T.items.cols, widths: [0.38, 0.12, 0.13, 0.14, 0.13, 0.1], align: ["l", "r", "r", "r", "l", "r"], rows: [
        ...inv.items.filter((i) => i.group !== "equipment").map((i) => [itemLabel(i, a, t, f), `${i.qty >= 10 || Number.isInteger(i.qty) ? f.int(i.qty) : f.num1(i.qty)} ${t.units[i.unit] || i.unit}`, f.eur2(i.unitPrice), f.eur(i.total), t.classes[i.cls] + (srcRef(i) ? ` · ${srcRef(i)}` : ""), `±${f.int(i.band * 100)} %`]),
        [t.sec.items.equipmentLine, "", "", f.eur(sum(eqItems, (i) => i.total)), t.sec.items.seeEquipment, ""],
        [{ text: T.investment.total, strong: true }, "", "", { text: f.eur(inv.capex), strong: true }, "", ""],
      ] }, note: T.items.note });

    // 8 HVAC: preliminary engineering estimate
    const hv = inv.hvac;
    S.push({ id: "hvac", title: T.hvac.title, intro: T.hvac.intro, rows: [
      { label: T.hvac.load, value: `${f.num1(hv.coolingKw)} kW`, tag: "est", strong: true, note: `${f.int(hv.wPerM2)} W/m²` },
      { label: T.hvac.range, value: `${f.num1(hv.range[0])} – ${f.num1(hv.range[1])} kW`, tag: "est" },
      { label: T.hvac.people, value: `${f.num1(hv.loads.people)} kW`, tag: "est" },
      { label: T.hvac.envelope, value: `${f.num1(hv.loads.envelope + hv.loads.lighting + hv.loads.equipment)} kW`, tag: "asm" },
      { label: T.hvac.air, value: `${f.int(hv.airflow)} m³/h · ${f.num1(hv.loads.ventilation)} kW`, tag: "est" },
      { label: T.hvac.recovery, value: hv.recoveryRequired ? t.yes : t.no, tag: "ver" },
      { label: T.hvac.system, value: t.hvacSystems[inv.hvacSystem], tag: "asm" },
      { label: T.hvac.reuse, value: t.hvacReuse[inv.reuse], tag: def("hvac") },
      { label: T.hvac.cost, value: f.eur(inv.byGroup.hvac), tag: "est" },
      { label: T.hvac.document, value: hv.coolingKw > P.HVAC.projectThresholdKw || hv.range[1] > P.HVAC.projectThresholdKw ? T.hvac.project : T.hvac.memoria, tag: "ver" },
    ], note: T.hvac.note });

    // 9 revenue by stream, VAT by stream
    const R = s.rev;
    S.push({ id: "revenue", title: T.revenue.title, intro: fill(T.revenue.intro, { m: c.ramp.months + 1 }),
      table: { columns: T.revenue.cols, widths: [0.32, 0.17, 0.12, 0.17, 0.22], rows: [
        ...["membership", "enrolment", "pt", "other"].filter((k) => R.gross[k] > 0).map((k) => [t.streams[k], f.eur(R.gross[k]), f.pct(P.VAT[k]), f.eur(R.gross[k] - R.net[k]), f.eur(R.net[k])]),
        [{ text: T.revenue.total, strong: true }, { text: f.eur(R.grossTotal), strong: true }, "", { text: f.eur(R.iva), strong: true }, { text: f.eur(R.netTotal), strong: true }],
      ] },
      rows: [
        { label: T.revenue.fee, value: f.eur2(a.fee), tag: feeVerified(a.input.key, a.input.city) ? "ver" : "asm" },
        { label: T.revenue.perMember, value: f.eur2(s.members ? R.netTotal / s.members : 0), tag: "est" },
      ], note: T.revenue.note });

    // 10 operating costs and EBITDA
    const ck = Object.keys(s.costs).filter((k) => s.costs[k] > 0);
    S.push({ id: "opex", title: T.opex.title, intro: T.opex.intro,
      rows: [
        { label: T.opex.net, value: f.eur(s.net), tag: "scn", strong: true },
        ...ck.map((k) => ({ label: t.costs[k] || k, value: f.eur(s.costs[k]), tag: "est" })),
        { label: T.opex.total, value: f.eur(s.opex), tag: "est", strong: true },
        { label: T.opex.ebitda, value: f.eur(s.ebitda), tag: "scn", strong: true, negative: neg(s.ebitda) },
        { label: T.opex.margin, value: s.net > 0 ? f.pct(s.ebitda / s.net) : t.na, tag: "scn" },
      ],
      chart: { items: [{ label: T.opex.net, value: s.net, display: f.eur(s.net), tone: "ink" }, ...ck.map((k) => ({ label: t.costs[k] || k, value: s.costs[k], display: f.eur(s.costs[k]) })),
        { label: T.opex.ebitda, value: s.ebitda, display: f.eur(s.ebitda), tone: s.ebitda < 0 ? "neg" : "pos" }] },
      note: T.opex.note });

    // 11 break-even
    S.push({ id: "breakeven", title: T.breakeven.title, intro: T.breakeven.intro, rows: [
      { label: T.breakeven.members, value: a.breakEven == null ? t.na : f.int(a.breakEven), tag: "est", strong: true },
      { label: T.breakeven.share, value: a.breakEven == null || !a.ach.base ? t.na : f.pct(a.breakEven / a.ach.base), tag: "est" },
      { label: T.breakeven.fixed, value: f.eur(a.fixed), tag: "est" },
      { label: T.breakeven.perMember, value: f.eur2(a.perMember), tag: "est" },
      { label: T.breakeven.first, value: a.firstPositive ? fill(t.u.monthN, { n: a.firstPositive }) : t.never, tag: "scn" },
    ], note: T.breakeven.note });

    // 12 cash flow and payback
    const shown = a.months.filter((m) => m.month <= 24 || m.month % 12 === 0 || m.month === a.paybackMonth);
    const pb = a.investor.payback;
    S.push({ id: "cashflow", title: T.cashflow.title, intro: T.cashflow.intro, rows: [
      { label: T.cashflow.capex, value: f.eur(inv.capex), tag: "est" },
      { label: T.cashflow.preOpening, value: f.eur(a.preOpening.payroll + a.preOpening.marketing), tag: "est" },
      { label: T.cashflow.deposit, value: f.eur(a.preOpening.deposit), tag: "est" },
      { label: T.cashflow.upfront, value: f.eur(a.upfront), tag: "est", strong: true },
      { label: T.cashflow.operational, value: months(a.paybackMonth, t, f), tag: "scn", strong: true },
      { label: T.cashflow.simple, value: a.simplePaybackYears == null ? t.na : `${f.num1(a.simplePaybackYears)} ${t.u.years}`, tag: "scn" },
      { label: T.cashflow.project, value: months(pb.project, t, f), tag: "asm" },
      { label: T.cashflow.equity, value: months(pb.equity, t, f), tag: "asm" },
    ],
    table: { columns: T.cashflow.cols, widths: [0.12, 0.14, 0.19, 0.19, 0.17, 0.19], rows: [
      ["0", "", "", "", money(-a.upfront), money(-a.upfront)],
      ...shown.map((m) => [{ text: String(m.month), strong: m.month === a.paybackMonth }, f.int(m.members), f.eur(m.net), f.eur(m.opex), money(m.ebitda), { ...money(m.cumulative), strong: m.month === a.paybackMonth }]),
    ] },
    note: fill(T.cashflow.note, { tax: f.pct(P.INVESTOR.taxRate), debt: f.pct(P.INVESTOR.debtShare), rate: f.pct(P.INVESTOR.rate), term: P.INVESTOR.termMonths / 12, repl: f.pct(P.INVESTOR.replacementShareYear), from: P.INVESTOR.replacementStartYear }) });

    // 13 demand scenarios
    const L = a.scenarios;
    S.push({ id: "scenarios", title: T.scenarios.title, intro: T.scenarios.intro,
      table: { columns: [T.scenarios.item, ...L.map((x) => t.demands[x.demand])], rows: [
        [T.scenarios.members, ...L.map((x) => f.int(x.a.ach.base))],
        [T.scenarios.gross, ...L.map((x) => f.eur(x.a.steady.gross))],
        [T.scenarios.net, ...L.map((x) => f.eur(x.a.steady.net))],
        [T.scenarios.opex, ...L.map((x) => f.eur(x.a.steady.opex))],
        [{ text: T.scenarios.ebitda, strong: true }, ...L.map((x) => ({ ...money(x.a.steady.ebitda), strong: true }))],
        [T.scenarios.breakEven, ...L.map((x) => (x.a.breakEven == null ? t.na : f.int(x.a.breakEven)))],
        [T.scenarios.operational, ...L.map((x) => months(x.a.paybackMonth, t, f))],
        [T.scenarios.project, ...L.map((x) => months(x.iv.payback.project, t, f))],
        [T.scenarios.equity, ...L.map((x) => months(x.iv.payback.equity, t, f))],
      ] }, note: T.scenarios.note });

    // 14 recommendations (conditional)
    const rec = [];
    if (!["ideal", "viable"].includes(suitability(c, area))) rec.push({ level: "alert", key: "outOfRange", vars: { c: t.concepts[a.input.key].name, min: f.int(c.area.min), max: f.int(c.area.max) } });
    if (s.ebitda <= 0) rec.push({ level: "alert", key: "loss" });
    else if (a.breakEven != null && a.breakEven > 0.85 * a.ach.base) rec.push({ level: "warn", key: "tight" });
    const better = rk.cands.filter((x) => x.k !== a.input.key && rankCmp(x, rk.pick) < 0).map((x) => ({ k: x.k }));
    if (better.length) rec.push({ level: "opp", key: "alternative", vars: { c: better.map((x) => t.concepts[x.k].name).join(", ") } });
    rec.push({ level: "warn", key: "demand" });
    rec.push({ level: "warn", key: "hvac", vars: { kw: f.int(hv.coolingKw) } });
    if (inv.byClass.assumption / inv.capex > 0.3) rec.push({ level: "warn", key: "quotes", vars: { p: f.pct(inv.byClass.assumption / inv.capex) } });
    if (eqItems.some((i) => i.cls === "assumption" && i.key.startsWith("eq:"))) rec.push({ level: "alert", key: "reformer" });
    if (a.input.condition !== "exgym" && a.values.hvac === "auto") rec.push({ level: "opp", key: "reuse" });
    rec.push({ level: "ok", key: "regulations" });
    S.push({ id: "recommendations", title: T.recs.title, intro: T.recs.intro,
      bullets: rec.map((r) => ({ level: r.level, label: t.levels[r.level], text: fill(T.recs.texts[r.key], r.vars) })) });

    // uncertainty: source classes and their bands, the range, the payback classes
    S.push({ id: "uncertainty", title: G.sec.uncertainty.title, intro: G.sec.uncertainty.intro, rows: [
      ...["tariff", "official", "cype", "assumption"].filter((k) => inv.byClass[k]).map((k) => ({ label: `${t.classes[k]} (±${f.int(P.UNCERTAINTY[k] * 100)} %)`, value: `${f.eur(inv.byClass[k])} · ${f.pct(inv.byClass[k] / inv.capex)}`, tag: k === "tariff" || k === "official" ? "ver" : k === "cype" ? "est" : "asm" })),
      { label: G.sec.uncertainty.range, value: `${f.eur(inv.low)} – ${f.eur(inv.high)}`, tag: "est", strong: true },
      { label: G.sec.uncertainty.spread, value: `× ${f.num2(inv.spread)}`, tag: "est", note: inv.withinTarget ? T.investment.inTarget : T.investment.outTarget },
      { label: G.sec.uncertainty.members, value: `${f.int(a.ach.range[0])} – ${f.int(a.ach.range[1])}`, tag: "asm" },
    ], bullets: CLASS_ORDER.map((k) => ({ level: k === "notViable" ? "alert" : k === "long" || k === "beyond" ? "warn" : "zone", label: G.classes[k], text: G.classNotes[k] })),
    note: G.sec.uncertainty.note });

    // 15 method, sources, limitations
    const usedSrc = [...new Set(["TARIFF_2026", "CYPE", "CONVENIO", "SMI2026", "RENT", "ELEC", c.feeSrc, "FEES_CACOA", a.city.icioSrc, "RITE", "RITE_ART15", "ASHRAE", "IVA2026", "DGT_V3319_20", "IS2026", "BENCH_CAPEX", "MARKET"])].filter((k) => k && k !== "A" && P.SOURCES[k]);
    S.push({ id: "method", collapsed: true, title: T.method.title, intro: fill(T.method.intro, { version: MODEL_VERSION }),
      paragraphs: [t.gp.referenceMethod, ...T.method.paragraphs, T.method.sourcesHead, ...usedSrc.map((k) => `${P.SOURCES[k].title} — ${P.SOURCES[k].date}${P.SOURCES[k].url ? ` — ${P.SOURCES[k].url}` : ""}`)],
      note: T.method.disclaimer });
    return S;
  }

  // ---------------- detailed business plan: eight accordions ----------------
  const GROUPS = [
    { id: "space", secs: ["concept", "space"] },
    { id: "equipment", secs: ["equipment"] },
    { id: "investment", secs: ["investment", "items", "hvac"] },
    { id: "revenue", secs: ["capacity", "revenue"] },
    { id: "opex", secs: ["staff", "opex"] },
    { id: "finance", secs: ["breakeven", "cashflow", "scenarios"] },
    { id: "compare", secs: ["compare", "concepts"] },
    { id: "sources", secs: ["uncertainty", "recommendations", "method"] },
  ];
  function sectionHtml(s, t) {
    const tag = (k) => (k ? `<span class="rpc-tag rpc-tag--${k}">${esc(t.tags[k])}</span>` : "");
    const rows = (rs) => `<table class="rpc-table"><tbody>${rs.map((r) => `<tr${r.strong ? ' class="is-strong"' : ""}><th scope="row">${esc(r.label)}${r.note ? ` <span class="rpc-note">${esc(r.note)}</span>` : ""}</th><td>${tag(r.tag)}</td><td class="rpc-num${r.negative ? " is-neg" : ""}">${esc(r.value)}</td></tr>`).join("")}</tbody></table>`;
    const num = (tb, i) => i > 0 && !(tb.align && tb.align[i] === "l");
    const table = (tb) => `<div class="rpc-scroll"><table class="rpc-table rpc-table--grid"><thead><tr>${tb.columns.map((c, i) => `<th scope="col"${num(tb, i) ? ' class="rpc-num"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${tb.rows.map((r) => `<tr${r.some((c) => c && c.strong) ? ' class="is-strong"' : ""}>${r.map((c, i) => { const o = typeof c === "object" && c ? c : { text: c }; return i === 0 ? `<th scope="row">${esc(o.text)}</th>` : `<td class="${num(tb, i) ? "rpc-num" : "rpc-txt"}${o.negative ? " is-neg" : ""}">${esc(o.text)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
    const chart = (c) => { const max = Math.max(1, ...c.items.map((i) => Math.abs(i.value))); return `<div class="rpc-bars" aria-hidden="true">${c.items.map((i) => `<div class="rpc-bar rpc-bar--${i.tone || "accent"}${i.value < 0 ? " is-neg" : ""}"><span class="rpc-bar__l">${esc(i.label)}</span><span class="rpc-bar__t"><i style="width:${(100 * Math.abs(i.value) / max).toFixed(1)}%"></i></span><span class="rpc-bar__v">${esc(i.display)}</span></div>`).join("")}</div>`; };
    return `<div class="gp-sub" data-sub="${s.id}">
  <h4 class="gp-sub__title">${esc(s.title)}</h4>
  ${s.intro ? `<p class="rpc-intro">${esc(s.intro)}</p>` : ""}
  ${s.rows && s.table && s.id === "investment" ? rows(s.rows) + table(s.table) : `${s.table ? table(s.table) : ""}${s.rows ? rows(s.rows) : ""}`}
  ${s.chart ? chart(s.chart) : ""}
  ${s.bullets ? `<ul class="rpc-insights">${s.bullets.map((x) => `<li class="rpc-insight rpc-insight--${x.level}"><span class="rpc-insight__l">${esc(x.label)}</span> ${esc(x.text)}</li>`).join("")}</ul>` : ""}
  ${s.paragraphs ? s.paragraphs.map((p) => `<p class="rpc-p">${esc(p)}</p>`).join("") : ""}
  ${s.note ? `<p class="rpc-sec__note">${esc(s.note)}</p>` : ""}
</div>`;
  }
  function groupHtml(id, a, t, f, S) {
    const all = S || sections(a, t, f);
    return GROUPS.find((g) => g.id === id).secs.map((sid) => all.find((s) => s.id === sid)).filter(Boolean).map((s) => sectionHtml(s, t)).join("\n");
  }
  // the whole plan at once (tests, no-JavaScript fallbacks)
  function renderHtml(a, t, f) { const S = sections(a, t, f); return GROUPS.map((g) => groupHtml(g.id, a, t, f, S)).join("\n"); }

  // engine hook: the summary card is always live; an accordion is (re)built only while it is open
  function paint(box, results, ctx) {
    box.__gpLast = results;
    const card = box.querySelector("[data-gp-summary]");
    if (card) card.innerHTML = summaryHtml(results._an, ctx.t, ctx.f, box.__gpContact);
    const secs = [...box.querySelectorAll("details[data-gp-sec]")];
    let S = null;
    secs.forEach((d) => {
      const body = d.querySelector("[data-gp-body]");
      if (d.open) { S = S || sections(results._an, ctx.t, ctx.f); body.innerHTML = groupHtml(d.dataset.gpSec, results._an, ctx.t, ctx.f, S); d.__gpDirty = false; }
      else d.__gpDirty = true;
      if (!d.__gpWired) {
        d.__gpWired = true;
        d.addEventListener("toggle", () => { if (d.open && d.__gpDirty) { body.innerHTML = groupHtml(d.dataset.gpSec, box.__gpLast._an, ctx.t, ctx.f); d.__gpDirty = false; } });
      }
    });
    if (!box.__gpWired) {
      box.__gpWired = true;
      const dlg = box.querySelector("[data-gp-report]");
      const opener = box.querySelector("[data-gp-open-report]");
      if (dlg && opener) {
        opener.addEventListener("click", () => {
          if (!dlg.open) dlg.showModal();
          document.documentElement.classList.add("gp-report-open");
          const first = dlg.querySelector("details[data-gp-sec]");
          if (first && !first.open) first.open = true;                 // concept and space planning first
          if (window.track) window.track("calculator_report_opened", { calculator: "fitness", language: document.documentElement.lang });
        });
        dlg.querySelectorAll("[data-gp-report-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
        dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });   // click on the backdrop
        dlg.addEventListener("close", () => { document.documentElement.classList.remove("gp-report-open"); opener.focus({ preventScroll: true }); });
      }
      // "other concepts" and "viable from … m²" buttons set the inputs; the engine recalculates as for typing
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-gp-pick]");
        if (!b) return;
        const set = (sel, v) => { const el = box.querySelector(sel); if (el && v != null) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } };
        if (b.dataset.gpArea) set('[data-cf="area"]', b.dataset.gpArea);
        set('[data-cf="concept"]', b.dataset.gpPick);
        const adv = box.querySelector(".gp-adv"); if (adv) adv.open = true;
      });
    }
  }
  function summaryLine(v, r, f, ui) {
    return `${f.int(v.area)} m² · EBITDA ${f.eur(r.ebitda)}${ui.perMonth}`;
  }

  function report(v, r, ctx) {
    const { t, f, common, contact } = ctx;
    const a = r._an, G = t.gp;
    const neg = (x) => typeof x === "number" && x < 0;
    const all = sections(a, t, f);
    const S = GROUPS.flatMap((g, gi) => g.secs.map((sid, j) => { const s = all.find((x) => x.id === sid); return s && { ...s, title: `${gi + 1}${g.secs.length > 1 ? `.${j + 1}` : ""} · ${j === 0 ? G.groups[g.id] : s.title}${j === 0 && g.secs.length > 1 ? ` — ${s.title}` : ""}` }; })).filter(Boolean);
    const blocks = S.map((s, i) => ({ pageBreak: i === 0, heading: s.title, intro: s.intro, table: s.table,
      rows: s.rows && s.rows.map((x) => ({ ...x, tagKind: x.tag, tag: x.tag ? t.tags[x.tag] : "" })), chart: s.chart,
      bullets: s.bullets && s.bullets.map((x) => ({ ...x, level: x.level === "zone" ? "est" : x.level })), paragraphs: s.paragraphs, note: s.note }));
    blocks.push({ cta: { heading: t.cta.heading, lines: t.cta.lines, button: { label: t.cta.button, url: contact.whatsapp },
      links: [{ label: "3dna.es", url: "https://3dna.es/" }, { label: contact.email, url: `mailto:${contact.email}` }, { label: t.cta.calcLink, url: ctx.shareUrl }] } });
    return {
      ...common, title: t.pdfTitle, subtitle: t.pdfSubtitle, keywords: t.keywords,
      intro: [{ label: t.inputsTitle, rows: [
        [t.sec.summary.area, `${f.int(a.input.area)} m²`], [G.status[a.rank.status], t.concepts[a.input.key].name], [G.reference, G.referenceValue],
        [t.sec.summary.condition, t.conditions[a.input.condition]], [t.sec.summary.demand, t.demands[a.input.demand]],
      ] }],
      summary: [
        { label: t.cards.investment, value: f.eur(a.inv.headline.central), strong: true, note: fill(t.cards.range, { lo: f.keur(a.inv.low), hi: f.keur(a.inv.high) }) },
        { label: t.cards.ebitda, value: f.eur(a.steady.ebitda), negative: neg(a.steady.ebitda), note: fill(t.cards.ebitdaNote, { m: a.c.ramp.months + 1 }) },
        { label: t.cards.payback, value: a.paybackMonth ? fill(t.u.monthsShort, { n: f.int(a.paybackMonth) }) : t.never, note: G.classes[a.rank.pick.cls] },
        { label: t.cards.members, value: f.int(a.ach.base), note: fill(t.cards.membersNote, { n: f.int(a.cap.technicalMembers) }) },
      ],
      summaryNote: `${G.disclaimer} ${t.cards.note}`,
      legend: TAGS.map((key) => ({ key, label: t.tags[key], text: t.tagsHelp[key] })),
      blocks, footer: { ...common.footer, left: t.footerLeft },
    };
  }
  const TAGS = ["in", "def", "ver", "est", "asm", "max", "scn"];

  const model = { id: "fitness", version: 4, REFERENCE, fileStem: "Planificacion-Gimnasio", fields: FIELDS, defaults: DEFAULTS, ORDER, TAGS, MODEL_VERSION,
    P, ITEMS, GROUPS, CRITERIA, PAYBACK_CLASSES, analyze, investorView, recommend, suitability, alternatives, hvacSizing, membersAt, run, compute, candidates, paybackClass, reliability, rankCmp,
    summaryHtml, sections, groupHtml, renderHtml, paint, report, summaryLine };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  else {
    root.FitnessCalc = model;
    const go = () => {
      const box = document.querySelector('[data-calc="fitness"]');
      if (!box || !root.CalcTools) return;
      try { box.__gpContact = JSON.parse(box.querySelector("script[data-calc-i18n]").textContent).contact; } catch (e) { box.__gpContact = null; }
      root.CalcTools.mount(box, model);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go, { once: true });
    else go();
  }
})(typeof window !== "undefined" ? window : this);

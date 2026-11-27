/*
 * 3DNA Industrial — Canadian Ethanol Production Facility: centralized case-study data.
 *
 * One source of truth for the project panel, the "Data Sources & Assumptions" panel, the equipment
 * specifications and the financial model (factories/ethanol.js reads its defaults from ASSUMPTIONS).
 *
 *   VERIFIED     facts stated in public sources about the reference facility (with URL)
 *   BENCHMARKS   dated public market / industry figures used to calibrate the model (with URL)
 *   ASSUMPTIONS  3DNA engineering and financial assumptions: illustrative, not facility data
 *
 * Independent demonstration. No affiliation with the reference facility is implied; the 3D layout,
 * engineering networks and financial scenarios are conceptual and illustrative.
 * Research date: 27 November 2026.
 */
export const RESEARCHED = "2026-11-27";

export const PROJECT = {
  title: "Canadian Ethanol Production Facility",
  country: "Canada",
  province: "Saskatchewan",
  location: "Lanigan",
  coords: "51.85° N, 105.03° W (approx.)",
  industry: "Renewable Energy & Biofuel Manufacturing",
  technology: "Interactive Industrial Digital Twin",
  status: "Independent Demonstration",
  developer: "3DNA Industrial",
  reference: { name: "Pound-Maker Feedlot & Ethanol Plant", url: "https://pound-maker.ca/" },
  intro: "Explore a Canadian grain-based ethanol production facility through an interactive 3D environment combining industrial process visualization, equipment intelligence and financial modelling.",
  disclosure: "Independent demonstration developed by 3DNA Industrial, inspired by publicly available information about Canadian ethanol manufacturing. The 3D layout and financial scenarios are illustrative and do not represent confidential or verified operational data. No affiliation with the reference facility is implied.",
  networksNote: "Engineering networks (electrical, thermal, water, compressed air, wastewater, control and fire protection) are conceptual, for presentation, education and investment exploration. They are not the reference facility's verified infrastructure and are not suitable for construction, industrial control or engineering certification."
};

export const SOURCES = {
  pmAbout: { title: "Pound-Maker — About Us", url: "https://pound-maker.ca/pages/about-us", accessed: RESEARCHED },
  pmEthanol: { title: "Pound-Maker — Ethanol Plant Overview", url: "https://pound-maker.ca/pages/ethnol-plant-overview", accessed: RESEARCHED },
  pmFeedlot: { title: "Pound-Maker — Feedlot Overview", url: "https://pound-maker.ca/pages/feedlot-overview", accessed: RESEARCHED },
  katzen: { title: "KATZEN International — Pound-Maker Ethanol project showcase", url: "https://www.katzen.com/projectshowcase.aspx?p=4", accessed: RESEARCHED },
  esask: { title: "Encyclopedia of Saskatchewan — Poundmaker Ag-Ventures (2006)", url: "https://esask.uregina.ca/entry/poundmaker_ag-ventures.html", accessed: RESEARCHED },
  wheat: { title: "Grainews / Western Producer — Feed Grain Weekly, Saskatchewan delivered feed wheat C$6.88/bu (late October 2025)", url: "https://www.grainews.ca/daily/feed-grain-weekly-barley-wheat-swinging-upward", accessed: RESEARCHED },
  ethanol: { title: "S&P Global Platts — Canadian ethanol assessments (Toronto delivered, 11 March 2025: 70.71 CAD¢/L, incl. CFR credit)", url: "https://www.spglobal.com/energy/en/pricing-benchmarks/our-methodology/subscriber-notes/031225-platts-corrects-march-11-ethanol-chicago-pipeline-chicago-terminal-ethanol-ethanol-delivered-toronto-price-assessments", accessed: RESEARCHED },
  gas: { title: "SaskEnergy — business rates (commodity C$3.20/GJ since 1 October 2023)", url: "https://www.saskenergy.com/rates/", accessed: RESEARCHED },
  power: { title: "SaskPower — power supply rates (SaskPower-supplied transformation, 75–3,000 kVA)", url: "https://www.saskpower.com/-/media/saskpower/accounts-and-services/rates/service-rates/power-supply-rates/servicerates-saskpowersuppliedtransformation.pdf", accessed: RESEARCHED },
  energy: { title: "Mueller & Kwik, 2012 Corn Ethanol: Emerging Plant Energy and Environmental Technologies (University of Illinois at Chicago, 2013): 23,862 Btu/gal thermal, 0.75 kWh/gal", url: "https://ilcorn.org/news-and-media/current-news/article/illinois-corn-checkoff-funded-study-shows-increasing-ethanol-efficiencies", accessed: RESEARCHED },
  grant: { title: "Government of Saskatchewan — ethanol grant reduced and discontinued (2014 budget backgrounder)", url: "https://www.saskatchewan.ca/-/media/news-release-backgrounders/2014/budget/economyethanol-program-backgrounder.pdf", accessed: RESEARCHED }
};

// facts stated in public sources about the reference facility
export const VERIFIED = [
  { k: "Location", v: "Lanigan, Saskatchewan, Canada", src: "katzen" },
  { k: "Company established", v: "1970, by local area farmers (feedlot)", src: "pmAbout" },
  { k: "Ethanol plant start-up", v: "1991 — a 10 million-litre plant with a 10,000-head feedlot", src: "pmAbout" },
  { k: "Current ethanol production", v: "14.0 million litres per year", src: "pmAbout" },
  { k: "Daily output and grain", v: "≈ 40,000 L of ethanol from ≈ 110 t of wheat per day", src: "pmEthanol" },
  { k: "Feedstock", v: "High-starch feed wheat, spring and winter varieties; ≈ 10 L per bushel", src: "pmEthanol" },
  { k: "Process", v: "Screening, 3 storage bins, hammer mill, jet cooker, liquefaction, fermentation, distillation, molecular sieve dehydration", src: "pmEthanol" },
  { k: "Fermentation", v: "4 fermenters of 283,000 L; ≈ 20 h fill + 48 h fermentation; beer 10–12 % v/v", src: "pmEthanol" },
  { k: "Distillation / dehydration", v: "94 % at the column top; molecular sieve (4 desiccant vessels) to 99.5 %", src: "pmEthanol" },
  { k: "Product storage", v: "2 tanks of 500,000 L; ethanol denatured with gasoline", src: "pmEthanol" },
  { k: "Co-products", v: "Wet distillers grain (75–78 % moisture) and thin stillage, fully used in the feedlot", src: "pmEthanol" },
  { k: "No drying / evaporation", v: "Integrated design avoids stillage evaporation and drying", src: "katzen" },
  { k: "Water", v: "2 deep wells (300 ft); > 400,000 L/day; industrial reverse osmosis", src: "pmEthanol" },
  { k: "Feedlot", v: "One-time capacity of 26,000 head", src: "pmFeedlot" },
  { k: "Employees", v: "≈ 50 (company-wide), 75 % raised locally", src: "pmAbout" },
  { k: "Process design", v: "KATZEN International; 2011 molecular sieve and debottlenecking", src: "katzen" }
];

// dated public benchmarks used to calibrate the illustrative model
export const BENCHMARKS = [
  { k: "Feed wheat, Saskatchewan delivered", v: "C$6.88/bu ≈ C$253/t (Oct 2025)", src: "wheat" },
  { k: "Ethanol, Toronto delivered (Platts)", v: "70.71 CAD¢/L (11 Mar 2025, incl. CFR credit)", src: "ethanol" },
  { k: "Natural gas commodity (SaskEnergy)", v: "C$3.20/GJ (since 1 Oct 2023), delivery extra", src: "gas" },
  { k: "Electricity (SaskPower, 75–3,000 kVA)", v: "11.515¢/kWh first block, 7.222¢/kWh balance", src: "power" },
  { k: "Dry-mill energy benchmark (US, 2012)", v: "23,862 Btu/gal thermal (≈ 6.6 MJ/L); 0.75 kWh/gal (≈ 0.20 kWh/L)", src: "energy" },
  { k: "Saskatchewan ethanol grant", v: "Reduced from 15¢/L and discontinued (2014); not modelled", src: "grant" }
];

// 3DNA assumptions (illustrative): value, unit, basis
export const ASSUMPTIONS = {
  capacity: { v: 14, unit: "M L/year", basis: "Verified public production figure", src: "pmAbout" },
  days: { v: 350, unit: "days/year", basis: "14.0 M L ÷ 40,000 L/day (verified figures)", src: "pmEthanol" },
  yield: { v: 367, unit: "L/t", basis: "10 L/bushel ÷ 27.2155 kg/bushel (verified ratio)", src: "pmEthanol" },
  wheatPrice: { v: 255, unit: "C$/t", basis: "Saskatchewan delivered feed wheat, Oct 2025", src: "wheat" },
  ethanolPrice: { v: 0.71, unit: "C$/L", basis: "Platts Toronto delivered, Mar 2025 (incl. CFR credit)", src: "ethanol" },
  dgYield: { v: 0.32, unit: "t DM / t wheat", basis: "Engineering assumption: wheat distillers grains dry-matter yield" },
  dgValue: { v: 320, unit: "C$/t DM", basis: "Assumption: feed-replacement value of WDG in the feedlot ration (internal transfer)" },
  thermal: { v: 5.0, unit: "MJ/L", basis: "Assumption: below the 6.6 MJ/L dry-mill benchmark (no stillage drying), small-plant penalty", src: "energy" },
  gasPrice: { v: 5.0, unit: "C$/GJ", basis: "SaskEnergy commodity C$3.20/GJ + assumed delivery and fixed charges", src: "gas" },
  power: { v: 0.20, unit: "kWh/L", basis: "Dry-mill benchmark 0.75 kWh/gal", src: "energy" },
  powerPrice: { v: 0.09, unit: "C$/kWh", basis: "Assumed blend of SaskPower energy blocks + demand charges", src: "power" },
  water: { v: 400, unit: "m³/day", basis: "Verified > 400,000 L/day", src: "pmEthanol" },
  waterCost: { v: 0.6, unit: "C$/m³", basis: "Assumption: well pumping, reverse osmosis and wastewater handling" },
  chemicals: { v: 0.035, unit: "C$/L", basis: "Assumption: enzymes, yeast, chemicals and gasoline denaturant net" },
  staff: { v: 16, unit: "FTE", basis: "Assumption: ethanol plant share of ≈ 50 company employees (verified total)", src: "pmAbout" },
  wage: { v: 82000, unit: "C$/FTE/year", basis: "Assumption: loaded Saskatchewan industrial wage" },
  maintenance: { v: 2.0, unit: "% of CAPEX/year", basis: "Assumption: industry rule of thumb" },
  logistics: { v: 0.03, unit: "C$/L", basis: "Assumption: road tanker haul to blenders" },
  insurance: { v: 0.45, unit: "M C$/year", basis: "Assumption: insurance, admin, licences" },
  capexPerL: { v: 2.1, unit: "C$/L of capacity", basis: "Assumption: replacement cost for a 14 M L/year plant without stillage drying (small-scale premium over large dry mills)" }
};

export const CAPEX_SPLIT = [
  ["land", 0.05, "Land and site works", 0x8b9098],
  ["buildings", 0.2, "Buildings and construction", 0x64748b],
  ["equipment", 0.43, "Process equipment", 0x3b82f6],
  ["install", 0.24, "Engineering and installation", 0xf59e0b],
  ["contingency", 0.08, "Contingency", 0xa855f7]
];

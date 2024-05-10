import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import dayOfYear from "dayjs/plugin/dayOfYear";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import numbro from "numbro";
/**
 * Date/Time Utils
 */
dayjs.extend(utc);
dayjs.extend(LocalizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(dayOfYear)
export const useDayJs = () => {
  return dayjs;
};

numbro.zeroFormat('0')
numbro.setDefaults({
  thousandSeparated: true,
  mantissa: 3,
  negative: "parenthesis",
  spaceSeparated: true,


})

export const useNumbro = () => {
  return numbro;
};

export const toUTCUnix = (val): number => {
  return dayjs(val).utc().valueOf();
};
export const InpDateToUnix = (obj: Ref<number>, val: string) => {
  obj.value = toUTCUnix(val);
};

export const VModelPercent = (model) => computed({
  get: () => model.value / 100.,
  set: (val) => { model.value = val * 100 }
})

/**
 * Chart OPT
 */
export interface ChartYDataOption {
  title: string
  type: string
  unit?: string
  position?: 'Opposite' | 'None'
  data: Array<any>
}

export interface ChartOption {
  title?: string
  xData: {
    title: string
    data: Array<any>
  },
  yData: Array<ChartYDataOption>
}


/**
 * table option
 */
export interface TableCFOption {
  data: Array<number | null>[]
  headers: Array<string>
  columns: Array<object>
  cells: Array<object>
}

export interface OptTable {
  page: number;
  itemsPerPage: number;
  sortBy: { key: string; order?: boolean }[] | undefined;
  search: string | undefined;
}
export const ProjPaginationMeta = computed(() => {
  return <T extends { page: number; itemsPerPage: number }>(
    options: T,
    total: number
  ) => {
    const start = (options.page - 1) * options.itemsPerPage + 1;
    const end = Math.min(options.page * options.itemsPerPage, total);

    return `Showing ${start} to ${end} of ${total} entries`;
  };
});

export const Field2Array = (enumType) => {
  return Object.values(enumType).map((key, index) => ({
    title: key,
    value: index,
  }));
};

export const IndexOfField = (field, value) => {
  return Object.values(field).indexOf(value);
};

/**
 * Project interface
 */
export interface ProjectBase {
  id: number | null;
  name: string;
  description: string | null;
  type: number;
  updated_at: number | null;
  state: number
  multicase: number[]
}
export interface selImprCases {
  path: string
  caseID: Array<number>
}


export const defProj = (): ProjectBase => ({
  id: null,
  name: "",
  type: 1,
  description: null,
  updated_at: dayjs.utc().valueOf(),
  state: 0,
  multicase: []
});

export const ContractType = {
  Project: "Project", // 0
  PSC: "PSC Cost Recovery (CR)", // 1
  GS: "PSC Gross Split (GS)", // 2
  CRCR: "Transition CR - CR", // 3
  CRGS: "Transition CR - GS", // 4
  GSGS: "Transition GS - GS", // 5
  GSCR: "Transition GS - CR", // 6
} as const;

export const InflateToType = {
  Capex: "CAPEX",
  Opex: "OPEX",
  CapexOpex: "CAPEX AND OPEX",
  None: "None",
} as const;

export const ProducerType = {
  Oil: "Oil",
  Gas: "Gas",
  LPGpropane: "LPG propane",
  LPGbutane: "LPG butane",
  CO2: "CO2",
  Sulfur: "Sulfur",
  Electricity: "Electricity",
} as const;

export const prodUnit = (prodType: number): string => {
  switch (prodType) {
    case 0:
      return "MBOPY";
    case 1:
      return "BSCF";
    case 3:
    case 2:
      return "MT";
    case 4:
    case 5:
      return "Ton";
    case 6:
      return "Unit";
    default:
      return "-";
  }
}

export const prodPriceUnit = (prodType: number): string => {
  switch (prodType) {
    case 0:
      return "USD/BBL";
    case 1:
      return "USD/MMBTU";
    case 3:
    case 2:
      return "USD/T";
    case 4:
    case 5:
    case 6:
      return "MMUSD/Unit";
    default:
      return "-";
  }
}

export const ProdTypeSymbol = (tipe: number): string => {
  switch (tipe) {
    case 0:
      return "O";
    case 1:
      return "G";
    case 2:
      return "P";
    case 3:
      return "B";
    case 4:
      return "C";
    case 5:
      return "S";
    case 6:
      return "E";
    default:
      return "-";
  }
};
export interface gsaBase {
  vol1: number | null
  ghv1: number | null
  price1: number | null
  vol2?: number | null
  ghv2?: number | null
  price2?: number | null
  vol3?: number | null
  ghv3?: number | null
  price3?: number | null
  vol4?: number | null
  ghv4?: number | null
  price4?: number | null
  vol5?: number | null
  ghv5?: number | null
  price5?: number | null
}
export interface prodPriceBase {
  year: number | null
  sales?: number | null
  price?: number | null
  condensate_sales?: number | null
  condensate_price?: number | null
  production?: number | null
  gsa?: gsaBase
}

export interface producerConfig {
  Tipe: number;
  onstream_date: number; // Onstream Date
  ProdNumber: number; // number of producer
  GSANumber: number; // number of GSA  (gas only)
  prod_price: Array<prodPriceBase[]>
}

export interface genConfig {
  type_of_contract: number;         // Type of Contract
  discount_rate_start_year: number   // Discount Rate Start Year
  discount_rate: number              // Discount Rate %
  inflation_rate_applied_to: number // Inflation Rate Applied to
  start_date_project: number         // Project Start Date (timestamp)
  end_date_project: number           // Project End Date (timestamp)
  start_date_project_second: number // Project Start Date (timestamp),  Transition Contract Only
  end_date_project_second: number   // Project End Date (timestamp), Transition Contract Only
}

export const defGenConfig = (): genConfig => ({
  type_of_contract: 1,
  discount_rate_start_year: 2024,
  discount_rate: 0.1,
  inflation_rate_applied_to: 3,
  start_date_project: dayjs.utc().valueOf(),
  end_date_project: dayjs.utc().add(35, "year").valueOf(),
  start_date_project_second: dayjs.utc().add(35, "year").add(1, 'day').valueOf(),
  end_date_project_second: dayjs.utc().add(70, "year").valueOf(),
});

export const defProdPriceBase = (index): prodPriceBase[] => {
  if (index == 0)
    return [{ year: null, sales: null, price: null, condensate_sales: null, condensate_price: null }]
  else if (index == 1)
    return [{ year: null, production: null, gsa: { vol1: null, ghv1: null, price1: null } }]
  return [{ year: null, sales: null, price: null }]
}

export const defProdConfig = (): producerConfig[] => [
  {
    Tipe: 0,
    onstream_date: dayjs.utc().add(13, "year").valueOf(),
    ProdNumber: 1,
    GSANumber: 0,

    prod_price: [defProdPriceBase(0)]
  },
];

export interface dmoRec {
  holiday: boolean;
  period: number;
  start_production: number;
  volume: number;
  fee: number;
}

export const TaxSplitType = {
  Conv: "Conventional",
  RC: "RC Split",
  ICP: "ICP Sliding Scale",
} as const;

export interface commonFTP {
  ftp_availability: boolean;
  ftp_is_shared: boolean;
  ftp_portion: number;
}

export interface TaxSplits {
  split_type: number;
  pre_tax_ctr_oil: number;
  pre_tax_ctr_gas: number;
}
export interface SlidingScaleType {
  bottom_limit: number | null
  top_limit: number | null
  pre_tax_ctr_oil: number | null
  pre_tax_ctr_gas: number | null
}

export interface IndicatorType {
  year: number | null
  indicator: number | null
}

export interface ICType {
  ic_availability: boolean;
  ic_oil: number;
  ic_gas: number;
}
export interface CRType {
  oil_cr_cap_rate: number;
  gas_cr_cap_rate: number;
}

export interface costRec {
  oil_ftp: commonFTP
  gas_ftp: commonFTP

  TaxSplit: TaxSplits;
  IC: ICType;
  CR: CRType;

  RCSlidingScale: SlidingScaleType[];
  ICPSlidingScale: SlidingScaleType[];
  Indicator: IndicatorType[];

  dmo_is_weighted: boolean;
  OilDMO: dmoRec;
  GasDMO: dmoRec;
}

export const defCostRec = (): costRec => ({
  oil_ftp: { ftp_availability: true, ftp_is_shared: true, ftp_portion: 0.2 },
  gas_ftp: { ftp_availability: true, ftp_is_shared: true, ftp_portion: 0.2 },

  TaxSplit: {
    split_type: 0,
    pre_tax_ctr_oil: 0.416667,
    pre_tax_ctr_gas: 0.520833,
  },
  IC: {
    ic_availability: false,
    ic_oil: 0.0,
    ic_gas: 0.0,
  },
  CR: {
    oil_cr_cap_rate: 1.0,
    gas_cr_cap_rate: 1.0,
  },
  RCSlidingScale: [
    { bottom_limit: null, top_limit: null, pre_tax_ctr_oil: null, pre_tax_ctr_gas: null }
  ],
  ICPSlidingScale: [
    { bottom_limit: null, top_limit: null, pre_tax_ctr_oil: null, pre_tax_ctr_gas: null }
  ],
  Indicator: [{ year: null, indicator: null }],
  dmo_is_weighted: false,
  OilDMO: {
    holiday: true,
    period: 60,
    start_production: dayjs.utc().valueOf(),
    volume: 0.25, fee: 0.25,
  },
  GasDMO: {
    holiday: true,
    period: 60,
    start_production: dayjs.utc().valueOf(),
    volume: 0.25, fee: 0.25,
  },
});

export const FieldStat = {
  POD1: "POD I",
  POD2: "POD II",
  NoPOD: "No POD",
} as const;

export const FieldLoc = {
  Onshore: "Onshore",
  Offshore20: "Offshore (0<h<=20)",
  Offshore50: "Offshore (20<h<=50)",
  Offshore150: "Offshore (50<h<=150)",
  Offshore1000: "Offshore (150<h<=1000)",
  OffshoreUp: "Offshore (h>1000)",
} as const;

export const ResDepth = {
  DepthDn: "<=2500",
  DepthUp: ">2500",
} as const;

export const InfAvail = {
  WellDev: "Well Developed",
  Offshore: "New Frontier Offshore",
  Onshore: "New Frontier Onshore",
} as const;

export const ResType = {
  Conv: "Conventional",
  NonConv: "Non Conventional",
} as const;

export const APiType = {
  ApiDn: "<25",
  ApiUp: ">=25",
} as const;

export const DCUType = {
  DCU1: "x<30",
  DCU2: "30<=x<50",
  DCU3: "50<=x<70",
  DCU4: "70<=x<100",
} as const;

export const TahapProdType = {
  Tahap1: "Primary",
  Tahap2: "Secondary",
  Tahap3: "Tertiary",
} as const;

export const CO2Type = {
  CO2_1: "<5",
  CO2_2: "5<=x<10",
  CO2_3: "10<=x<20",
  CO2_4: "20<=x<40",
  CO2_5: "40<=x<60",
  CO2_6: "60<=x",
} as const;

export const H2SType = {
  H2S_1: "<100",
  H2S_2: "100<=x<1000",
  H2S_3: "1000<=x<2000",
  H2S_4: "2000<=x<3000",
  H2S_5: "3000<=x<4000",
  H2S_6: "4000<=x",
} as const;

export interface GS {
  field_status: number;
  field_location: number;
  reservoir_depth: number;
  infrastructure_availability: number;
  reservoir_type: number;
  co2_content: number;
  h2s_content: number;
  oil_api: number;
  domestic_content_use: number;
  production_stage: number;

  ministry_discretion_split: number;
  oil_base_split: number;
  gas_base_split: number;

  dmo_is_weighted: boolean;
  OilDMO: dmoRec;
  GasDMO: dmoRec;
}

export const defGS = (): GS => ({
  field_status: IndexOfField(FieldStat, FieldStat.NoPOD),
  field_location: IndexOfField(FieldLoc, FieldLoc.Onshore),
  reservoir_depth: IndexOfField(ResDepth, ResDepth.DepthDn),
  infrastructure_availability: IndexOfField(InfAvail, InfAvail.WellDev),
  reservoir_type: IndexOfField(ResType, ResType.Conv),
  co2_content: IndexOfField(CO2Type, CO2Type.CO2_2),
  h2s_content: IndexOfField(H2SType, H2SType.H2S_2),
  oil_api: IndexOfField(APiType, APiType.ApiDn),
  domestic_content_use: IndexOfField(DCUType, DCUType.DCU1),
  production_stage: IndexOfField(TahapProdType, TahapProdType.Tahap1),

  ministry_discretion_split: 0.08,
  oil_base_split: 0.43,
  gas_base_split: 0.48,

  dmo_is_weighted: true,
  OilDMO: {
    holiday: true,
    period: 60,
    start_production: dayjs.utc().valueOf(),
    volume: 0.25, fee: 0.25,
  },
  GasDMO: {
    holiday: true,
    period: 60,
    start_production: dayjs.utc().valueOf(),
    volume: 0.25, fee: 0.25,
  },
});

export interface Contracts {
  cr: costRec
  gs: GS
  second: costRec | GS | null
}

export const defContracts = (): Contracts => ({
  cr: defCostRec(),
  gs: defGS(),
  second: null,
})

export const TaxType = {
  Single: "User Input - Single value",
  Multi: "User Input - Multi value",
  Nailed: "Nailed Down",
  Prevailing: "Prevailing",
} as const;

export const TaxPaymentType = {
  PDJP: "PDJP No.20 Tahun 2017",
  PrePDJP: "Pre-PDJP No.20 Tahun 2017",
  Direct: "Direct Mode",
} as const;

export const DepreciationType = {
  Decline: "Declining Balance",
  PSC: "PSC Declining Balance",
  Unit: "Unit Of Production",
  Straight: "Straight Line",
} as const;

export const GlobalType = {
  Single: "User Input - Single value",
  Multi: "User Input - Multi value",
} as const;

export const NVPType = {
  NPV1: "SKK Full Cycle Real Terms",
  NPV2: "SKK Full Cycle Nominal Terms",
  NPV3: "Full Cycle Real Terms",
  NPV4: "Full Cycle Nominal Terms",
  NPV5: "Point Forward",
} as const;

export const DiscType = {
  End: "End Year",
  Mid: "Mid Year",
} as const;

export const OthRevType = {
  OthRev1: "Addition to Oil Revenue",
  OthRev2: "Addition to Gas Revenue",
  OthRev3: "Reduction to Oil OPEX",
  OthRev4: "Reduction to Gas OPEX",
} as const;

export interface GlobalTabValue {
  year: number | null
  rate: number | null
}

export interface GlobalUInputValue {
  mode: number
  single: number
  multi: GlobalTabValue[]
}

export interface Tax {
  tax_mode: number
  tax_rate_init: number
  multi_tax_init: GlobalTabValue[]
}

export interface Depreciation {
  depreciation_method: number        // Depreciation Method
  decline_factor: number             // Decline Factor
}

export interface FiskalBase {
  transferred_unrec_cost: number   // for 2nd project only
  Tax: Tax                         // Tax Object
  tax_payment_config: number       // TaxPayment: Tax of PSC Cost Recovery  !PSC Only
  asr_future_rate: number          // ASR: Future Rate
  Depreciation: Depreciation       // Depreciation Object
  Inflation: {                     // Inflation Object  
    inflation_rate_mode: number,
    inflation_rate_init: number,
    multi_inflation_init: GlobalTabValue[]
  }
  VAT: {                           // VAT Object
    vat_mode: number,
    vat_rate_init: number,
    multi_vat_init: GlobalTabValue[]
  }
  LBT: {                           // LBT Object
    lbt_mode: number,
    lbt_rate_init: number,
    multi_lbt_init: GlobalTabValue[]
  }
  vat_discount: number             // VAT Discount
  lbt_discount: number             // LBT Discount
  npv_mode: number                 // NPV Mode 
  discounting_mode: number         // Discounting Mode

  sulfur_revenue_config: number      // Sulfur Revenue
  electricity_revenue_config: number // Electricity Revenue
  co2_revenue_config: number         // CO2 Revenue

  sunk_cost_reference_year: number  // Sunk Cost Reference Year
}

export interface Fiskal {
  Fiskal: FiskalBase
  Fiskal2: FiskalBase
}

export const defFiskalBase = (): FiskalBase => ({
  transferred_unrec_cost: 0.0,
  Tax: { tax_mode: 0, tax_rate_init: 0.42, multi_tax_init: [{ year: 2024, rate: 0.40 }] },
  tax_payment_config: 1,
  asr_future_rate: 0.00,
  Depreciation: { depreciation_method: 1, decline_factor: 2 },
  Inflation: { inflation_rate_mode: 0, inflation_rate_init: 0.02, multi_inflation_init: [{ year: null, rate: null }] },
  VAT: { vat_mode: 0, vat_rate_init: 0.02, multi_vat_init: [{ year: null, rate: null }] },
  LBT: { lbt_mode: 0, lbt_rate_init: 0.02, multi_lbt_init: [{ year: null, rate: null }] },
  vat_discount: 0.0,
  lbt_discount: 0.0,
  npv_mode: 3,
  discounting_mode: 0,

  sulfur_revenue_config: 0,
  electricity_revenue_config: 0,
  co2_revenue_config: 1,

  sunk_cost_reference_year: dayjs.utc().year(),
});

export const defFiskal = (): Fiskal => ({
  Fiskal: defFiskalBase(),
  Fiskal2: defFiskalBase(),
})


/**
 * EXCEL Column Type
 */
export interface ExcelColumnType {
  colHeaders: string[]
  columns: Object[]
}

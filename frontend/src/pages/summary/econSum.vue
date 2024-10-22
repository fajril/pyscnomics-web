<script setup lang="ts">
import { VuePDF, usePDF } from '@tato30/vue-pdf'
import '@tato30/vue-pdf/style.css'

// import PdfApp from "vue3-pdf-app"
// import "vue3-pdf-app/dist/icons/main.css"

// import html2canvas from 'html2canvas';
import { useAppStore } from "@/stores/appStore"
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscMonteStore } from '@/stores/monteStore'
import { usePyscOptimStore } from '@/stores/optimStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import printJS from 'print-js'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

// import { jsPDF } from 'jspdf'

definePage({
  name: 'pysc-ecosum',
  path: '/pysc-ecosum',
  meta: {
    title: "Economic Summary",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscSens = usePyscSensStore()
const PyscMonte = usePyscMonteStore()
const PyscOptim = usePyscOptimStore()
const numbro = Pysc.useNumbro()

const tableHeaderType = {
  C_Year: "Year",
  C_Lifting_Oil: "Lifting Oil",
  Lifting_oil: "Lifting Oil",
  C_Lifting_Gas: "Lifting Gas",
  Lifting_gas: "Lifting Gas",
  C_Revenue: "Revenue",
  C_Depreciable: "Tangible",
  C_Intangible: "Intangible",
  C_Opex: "Opex",
  C_ASR: "ASR",
  C_Depreciation: "Depreciation",
  C_Non_Capital: "Non Capital",
  C_Total_Expenses: "Total Expenses",
  C_FTP: "FTP",
  C_FTP_CTR: "FTP Ctr.",
  C_FTP_GOV: "FTP Gov.",
  C_IC: "IC",
  C_Unrecovered_before_TF: "Unrecovered before TF",
  C_Cost_Recovery: "Cost Recovery",
  C_ETS_before_TF: "ETS before TF",
  C_Unrecovered_after_TF: "Unrecovered after TF",
  C_Cost_to_be_Recovered_after_TF: "Cost to be Recovered after TF",
  C_Cost_Recovery_after_TF: "Cost Recovery after TF",
  C_ETS_after_TF: "ETS after TF",
  C_Cost_To_Be_Deducted: "Cost to be Deducted",
  C_Carry_Forward_Cost: "Carry Forward Cost",
  C_Deductible_Cost: "Deductible Cost",
  C_Carry_Forward_Cost_after_TF: "Carry Forward Cost after TF",
  C_CTR_Share_After: "Ctr. Share After",
  C_CTR_Net_Operating_Profit: "Ctr. Net Operating Profit",
  C_Contractor_Share: "Contractor Share",
  C_Government_Share: "Government Share",
  C_DMO_Volume: "DMO Volume",
  C_DMO_Fee: "DMO Fee",
  C_DDMO: "DDMO",
  C_Taxable_Income: "Taxable Income",
  C_Tax_Due: "Tax Due",
  C_Unpaid_Tax_Balance: "Unpaid Tax Balance",
  C_Tax: "Tax Payment",
  C_Tax_Payment: "Tax Payment",
  C_Net_CTR_Share: "Ctr. Net Share",
  C_CTR_Net_Share: "Ctr. Net Share",
  C_Contractor_Take: "Contractor Take",
  C_Cashflow: "Cashflow",
  cum_C_Cashflow: "Cum. Cashflow",
  C_Government_Take: "Government Take",
  C_Government_take: "Government Take",
} as const

const refHtml = ref()
const currentPdf = ref()

const { pdf, pages, info } = usePDF(currentPdf)
const finalY = ref(1)
const spaceV = 0.2
const showlink = ref(false)
const dwnldlink = ref(null)

const pfdConfig = ref({
  sidebar: false,
  toolbar: {
    toolbarViewerRight: false,
  },

})

const buildPDF = async () => {
  const pyKeyOfTable = [
    // { index: -1, total: null, name: 'Year', keys: ['year', 'years'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'Lifting', keys: ['lifting'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'Lifting Oil', keys: ['lifting_oil', 'c_lifting_oil'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Lifting Gas', keys: ['lifting_gas', 'c_lifting_gas'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: null, name: 'Price', keys: ['price'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'Revenue', keys: ['revenue', 'c_revenue'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'Government Share', keys: ['c_government_share'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Contractor Share', keys: ['c_contractor_share'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Depreciation', keys: ['c_depreciation'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Depreciable', keys: ['depreciable', 'c_depreciable', 'tangible'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'Intangible', keys: ['intangible', 'c_intangible'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'OPEX', keys: ['opex', 'c_opex'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'ASR', keys: ['asr', 'c_asr'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'sum', name: 'Revenue', keys: ['revenue'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Depreciation', keys: ['depreciation', 'c_depreciation'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Non Capital', keys: ['non_capital', 'c_non_capital'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Total Expenses', keys: ['c_total_expenses'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'FTP', keys: ['ftp', 'c_ftp'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'FTP - CTR', keys: ['ftp_ctr', 'c_ftp_ctr'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'FTP - GOV', keys: ['ftp_gov', 'c_ftp_gov'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Investment Credit', keys: ['investment_credit', 'c_ic'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'last', name: 'Unrecovered Cost', keys: ['unrecovered_cost', 'c_unrecovered_before_tf'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'last', name: 'Cost To Be Recovered', keys: ['cost_to_be_recovered'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Cost Recovery', keys: ['cost_recovery', 'c_cost_recovery'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Equity To Be Shared (ETS) Before Transfer', keys: ['ets_before_transfer', 'c_ets_before_tf'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: null, name: 'BaseSplit', keys: ['base_split'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: null, name: 'Variable Split', keys: ['variable_split'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: null, name: 'Progressive Split', keys: ['progressive_split'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: null, name: 'Contractor Split', keys: ['contractor_split'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Transfer (Tf) to GAS', keys: ['transfer_to_gas'], cr_o: 1, cr_tr_o: 1, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Transfer (Tf) to OIL', keys: ['transfer_to_oil'], cr_o: 0, cr_tr_o: 0, cr_g: 1, cr_tr_g: 1, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'last', name: 'Unrec. After Tf', keys: ['unrec_after_transfer', 'c_unrecovered_after_tf'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'last', name: 'Cost To Be Recovered After Tf', keys: ['cost_to_be_recovered_after_tf', 'c_cost_to_be_recovered_after_tf'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Cost Recovery After Tf', keys: ['cost_recovery_after_tf', 'c_cost_recovery_after_tf'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'ETS After Tf', keys: ['ets_after_transfer', 'c_ets_after_tf'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Contractor Share', keys: ['contractor_share', 'c_contractor_share'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Government Share', keys: ['government_share', 'c_government_share'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Depreciation', keys: ['depreciation'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Non Capital', keys: ['non_capital'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Total Expenses', keys: ['total_expenses'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Cost To Be Deducted', keys: ['cost_to_be_deducted', 'c_cost_to_be_deducted'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Carry Forward Cost', keys: ['carry_forward_cost', 'c_carry_forward_cost'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Deductible Cost', keys: ['deductible_cost', 'c_deductible_cost'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Transfer To Gas', keys: ['transfer_to_gas'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Transfer To Oil', keys: ['transfer_to_oil'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 0, gs_tr_o: 0, gs_g: 1, gs_tr_g: 1, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Carry Forward Cost after TF', keys: ['carry_forward_cost_after_tf', 'c_carry_forward_cost_after_tf'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'CTR Share After TF', keys: ['ctr_share_after_tf', 'c_ctr_share_after'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'CTR Net Operating Profit', keys: ['ctr_net_operating_profit', 'c_ctr_net_operating_profit'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'DMO Volume', keys: ['dmo_volume', 'c_dmo_volume'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'DMO Fee', keys: ['dmo_fee', 'c_dmo_fee'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'DDMO', keys: ['ddmo', 'c_ddmo'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Taxable Income', keys: ['taxable_income', 'c_taxable_income'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Tax Due', keys: ['c_tax_due'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Unpaid Tax Balance', keys: ['c_unpaid_tax_balance'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Tax Payment', keys: ['tax_payment', 'c_tax_payment'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Tax', keys: ['tax', 'c_tax'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 0, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Contractor Net Share', keys: ['contractor_net_share', 'c_ctr_net_share', 'net_ctr_share', 'c_net_ctr_share'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'CTR Take', keys: ['c_contractor_take'], cr_o: 0, cr_tr_o: 0, cr_g: 0, cr_tr_g: 0, cr__cons: 1, gs_o: 0, gs_tr_o: 0, gs_g: 0, gs_tr_g: 0, gs_cons: 0, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Cashflow', keys: ['cashflow', 'c_cashflow', 'ctr_cash_flow'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 1, bp_g: 1, bp_cons: 1 },
    { index: -1, total: 'last', name: 'Cum. Cashflow', keys: ['cum_cashflow', 'cum_cash_flow', 'cum. c_cashflow', 'cum._cashflow', 'cum.c_cashflow', 'cum_c_cashflow'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
    { index: -1, total: 'sum', name: 'Governent Take', keys: ['government_take', 'c_government_take'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 0, bp_g: 0, bp_cons: 0 },
  ]

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: "letter",
  })

  doc.setFontSize(11)
  doc.setTextColor('black')
  finalY.value = 1

  console.log(doc.getFontList())

  const current_Font = JSON.parse(JSON.stringify(doc.getFont()))

  // current_Font.fontName = 'helvetica'

  const KeyofHeadTable = Object.keys(tableHeaderType)
  const ValueofHeadTable = Object.values(tableHeaderType)

  const dGConf = PyscConf.generalConfig
  const dFisc = PyscConf.fiscal
  const dContr = PyscConf.contracts
  const dProd = PyscConf.producer
  const dTan = PyscConf.tangible
  const dIntan = PyscConf.intangible
  const dOpex = PyscConf.opex
  const dASR = PyscConf.asr
  const dCOS = PyscConf.cos
  const dLBT = PyscConf.lbt

  await useDataStore().saveCaseData(appStore.curWS, appStore.curSelCase,
    dGConf, dProd, dContr, dFisc,
    dTan, dIntan,
    dOpex, dASR, dCOS, dLBT,
    PyscSens.sensConfig,
    PyscMonte.monteConfig,
    PyscOptim.optimConfig)

  const dataJson = useDataStore().curCase2Json()

  const buildExtSumm = async () => {
    doc.setFont(current_Font.fontName, undefined, undefined)
    doc.setTextColor('blue')
    doc.text('Executive Summary', 0.5, finalY.value, { align: 'left' })
    doc.setTextColor('black')

    // doc.setFont(current_Font.fontName, undefined, undefined)
    finalY.value += spaceV
    try {
      const { status, result } = await useHTTP().put({
        path: 'get_case_summaries',
        body: {
          type: dGConf.type_of_contract,
          caseid: appStore.curSelCase,
          json: btoa(JSON.stringify(dataJson)),
        },
        onError: (error: any) => { throw error },
      })

      if (status !== 200)
        throw { status, result }

      autoTable(doc, {
        startY: finalY.value,
        tableWidth: 'wrap',
        columns: [{ dataKey: 'param', header: '' }, { dataKey: 'value', header: 'Value' }, { dataKey: 'unit', header: 'Unit' }],
        columnStyles: {
          param: { halign: 'left', valign: 'top', fontSize: 9, cellPadding: { vertical: 0.04 } },
          value: { halign: 'right', valign: 'middle', fontSize: 9, cellPadding: { vertical: 0.04, horizontal: 0 } },
          unit: { halign: 'left', valign: 'middle', fontSize: 8, cellPadding: { vertical: 0.04, horizontal: 0.07 } },
        },
        showHead: 'everyPage',
        body: Pysc.templateSummary.map((m, i) => {
          const isChild = typeof m.grp === 'number' && m.grp < 0
          const isParent = typeof m.grp === 'number' && m.grp > 0
          const isPercent = typeof m.unit === 'string' && m.unit === '%'

          return [
            { content: m.param, styles: { fontStyle: isParent ? 'bold' : 'normal', cellPadding: { left: isChild ? 0.1 : 0.02, right: 1 } } },
            { content: Pysc.is_number(result.summary[i]) ? Pysc.fmtNumber(result.summary[i] * (isPercent ? 100 : 1), false, { mantissa: 2 }) : '' },
            { content: m.unit },
          ]
        }),
      })
      finalY.value = doc.lastAutoTable.finalY || finalY.value
      finalY.value += spaceV
      doc.setFontSize(7)
      doc.text("* 1 M = 1,000", 0.5, finalY.value)
      doc.setFontSize(11)
      finalY.value += spaceV
    }
    catch (error) {
    }
  }

  const buildCF = async () => {
    doc.addPage('letter', 'landscape')
    finalY.value = 1
    try {
      const { status, result } = await useHTTP().put({
        path: 'calc_cf',
        body: {
          type: PyscConf.dataGConf.type_of_contract,
          json: btoa(JSON.stringify(dataJson)),
        },
        onError: (error: any) => { throw error },
      })

      if (status !== 200)
        throw { status, result }
      for (let _lup = 1; _lup <= (PyscConf.dataGConf.type_of_contract < 3 ? 1 : 2); _lup++) {
        if (_lup > 1) {
          doc.addPage('letter', 'landscape')
          finalY.value = 1
        }

        // doc.setFont(current_Font.fontName, '', 'bold')
        doc.setTextColor('blue')
        if (PyscConf.dataGConf.type_of_contract < 3)
          doc.text('Consolidated CashFlow', 0.3, finalY.value, { align: 'left' })
        else
          doc.text(`Consolidated CashFlow - Contract ${_lup}`, 0.3, finalY.value, { align: 'left' })
        const table_ = (PyscConf.dataGConf.type_of_contract < 3 ? result.consolidated : (result[`contract_${_lup}`].consolidated))

        // remap keys
        const isCR = (_lup === 1 ? [1, 3, 4] : [3, 6]).includes(PyscConf.dataGConf.type_of_contract)

        const keyMapData = Object.keys(table_)

        const keyMapTmpl = /* JSON.parse(JSON.stringify */(PyscConf.dataGConf.type_of_contract === 0
          ? pyKeyOfTable.filter(k => k.bp_cons === 1)
          : (isCR ? pyKeyOfTable.filter(k => k.cr__cons === 1) : pyKeyOfTable.filter(k => k.gs_cons === 1)))// )

        const DYear = Object.keys(table_[keyMapData[0]])

        keyMapTmpl.forEach(k => k.index = keyMapData.findIndex(md => k.keys.includes(md.toLowerCase())))

        // console.log(table_)

        doc.setTextColor('black')
        finalY.value += spaceV
        autoTable(doc, {
          startY: finalY.value,
          margin: { left: 0.3, right: 0.5 },
          tableWidth: 'wrap',
          columns: [{ dataKey: 'year', header: 'Parameter' }, { dataKey: 'total', header: 'Total' }, ...DYear.map(k => ({ dataKey: k, header: k }))],
          headStyles: { fontSize: 7 },
          bodyStyles: { fontSize: 7, valign: 'middle', halign: 'right', cellPadding: { vertical: 0.035, horizontal: 0.04 } },
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: ['year', 'total'],
          columnStyles: {
            year: { halign: 'left' },
          },
          showHead: 'everyPage',
          body: keyMapTmpl.map(k => {
            const cols = k.index !== -1 ? Object.values(table_[keyMapData[k.index]]) : Array(DYear.length).fill(null)
            const _total = k.total === 'sum' ? cols.reduce((total, col) => total + (Pysc.is_number(col) ? col : 0), 0) : k.total === 'last' ? cols[cols.length - 1] : null

            return [k.name, (Pysc.is_number(_total) ? Pysc.fmtNumber(_total, false, { mantissa: 2 }) : ''), ...cols.map(col => Pysc.fmtNumber(col, false, { mantissa: 2 }))]
          }),

          /* Object.keys(table_).map(v => {
            const cols = Object.values(table_[v])
            const idxK = KeyofHeadTable.indexOf(v)

            return [idxK !== -1 ? ValueofHeadTable[idxK] : v,
              ...[
              // total
                Pysc.fmtNumber((v === 'cum_C_Cashflow' || v === 'C_Unrecovered_before_TF' || v === 'C_Unrecovered_after_TF')
                  ? cols[cols.length - 1]
                  : cols.reduce((total, col) => total + (Pysc.is_number(col) ? col : 0), 0), false, { mantissa: 2 }),
                ...cols.map(col => Pysc.fmtNumber(col, false, { mantissa: 2 })),
              ]]
          }), */
        })
        finalY.value = doc.lastAutoTable.finalY || finalY.value
        finalY.value += spaceV
      }
    }
    catch (error) {
      console.log(error)
    }
  }

  // TODO: write title

  await buildExtSumm()

  await buildCF()

  // const res = await html2canvas(document.getElementById('refHtml'), {
  //   width: 800,
  // }).then((canvas) => {
  //   console.log(canvas)

  //   const img = canvas.toDataURL("image/png");
  //   doc.addImage(img, "PNG", 1, finalY.value, doc.internal.pageSize.getWidth(), 3);
  //   console.log('0')
  // })
  // console.log('1')
  nextTick(() => {
    const blobPDF = new Blob([doc.output('blob')], { type: 'application/pdf' })

    console.log(blobPDF)
    nextTick(() => {
      currentPdf.value = URL.createObjectURL(blobPDF)
    })
  })
}

const PrintPDF = () => {
  printJS(currentPdf.value)
}

const SavePDF = () => {
  showlink.value = true
  nextTick(() => nextTick(() => {
    if (dwnldlink.value && currentPdf.value) {
      dwnldlink.value.href = currentPdf.value

      const namefile = `${appStore.selectedCase.name}.pdf`

      dwnldlink.value.setAttribute('download', namefile)
      dwnldlink.value.click()
    }
    nextTick(() => showlink.value = false)
  }))
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  buildPDF()
})

onMounted(() => {
  CallableFunc()
})
onUnmounted(() => {
  stopCaseID()
})

// JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9G
</script>

<template>
  <VCard density="compact">
    <VCardItem
      id="refHtml"
      class="pb-1"
    >
      <VCardTitle>
        Economic Summary
      </VCardTitle>
      <VCardSubtitle>
        PDF - Report
      </VCardSubtitle>
      <template #append>
        <VBtn
          icon
          variant="outlined"
          color="success"
          size="x-small"
          @click="PrintPDF"
        >
          <VIcon
            size="22"
            icon="tabler-printer"
          />
          <VTooltip
            activator="parent"
            open-delay="200"
            scroll-strategy="close"
          >
            <span class="text-capitalize">Print</span>
          </VTooltip>
        </VBtn>
        <VBtn
          icon
          variant="outlined"
          color="primary"
          size="x-small"
          class="ms-1"
          @click="SavePDF"
        >
          <VIcon
            size="22"
            icon="tabler-download"
          />
          <VTooltip
            activator="parent"
            open-delay="200"
            scroll-strategy="close"
          >
            <span class="text-capitalize">Save PDF</span>
          </VTooltip>
        </VBtn>
      </template>
    </VCardItem>
    <VCardText class="px-0 py-0">
      <PerfectScrollbar :options="{ wheelPropagation: true, suppressScrollY: true }">
        <VCard
          flat
          class="d-inline-block"
        >
          <VCardText>
            <!--
              <PdfApp
              :pdf="currentPdf"
              style="height: 100%;"
              :config="pfdConfig"
              />
            -->

            <VuePDF
              v-for="pg in pages"
              :pdf="pdf"
              :page="pg"
              text-layer
              class="mb-2"
              :scale="1.6"
            />
          </VCardText>
        </VCard>
      </PerfectScrollbar>
    </VCardText>
    <a
      v-if="showlink"
      ref="dwnldlink"
      href="#"
    />
  </VCard>
</template>

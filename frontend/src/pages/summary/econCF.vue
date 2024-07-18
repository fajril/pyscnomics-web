<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import { breakpointsVuetifyV3 } from '@vueuse/core'
import { add } from 'mathjs'
import { usePyscConfStore } from '@/stores/genfisStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import ColCollapsible from '@/views/components/colCollapsible.vue'
import ChartCF from '@/views/pages/summary/cfChart.vue'
import TableCF from '@/views/pages/summary/cfTable.vue'
import 'handsontable/dist/handsontable.full.min.css'

definePage({
  name: 'pysc-ecocf',
  path: '/pysc-ecocf',
  meta: {
    title: "Cashflow",
  },
})

const pyKeyOfTable = [
  { index: -1, total: null, name: 'Year', keys: ['year', 'years'], cr_o: 1, cr_tr_o: 1, cr_g: 1, cr_tr_g: 1, cr__cons: 1, gs_o: 1, gs_tr_o: 1, gs_g: 1, gs_tr_g: 1, gs_cons: 1, bp_o: 1, bp_g: 1, bp_cons: 1 },
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

const appStore = useAppStore()
const PyscConf = usePyscConfStore()

const tableOil1 = ref()
const tableOil2 = ref()
const tableGas1 = ref()
const tableGas2 = ref()
const tableCons1 = ref()
const tableCons2 = ref()

// 👉 Misc
const isLessThanCardBreak = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.md}px)`).value)

const tableCollapsed = ref<Array<boolean[]>>([[false, false], [false, false], [false, false]])

const OilOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  }, {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  },
])

const oil_ctr1 = computed(() => OilOpt.value[0])
const oil_ctr2 = computed(() => OilOpt.value[1])

const GasOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  }, {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  },
])

const gas_ctr1 = computed(() => GasOpt.value[0])
const gas_ctr2 = computed(() => GasOpt.value[1])

const ConstOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(35).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  }, {
    data: [Array(35).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  },
])

const const_ctr1 = computed(() => ConstOpt.value[0])
const const_ctr2 = computed(() => ConstOpt.value[1])

const isLoading = ref(false)

const numbro = Pysc.useNumbro()

const RefOChartCF1 = ref()
const RefOChartCF2 = ref()
const RefGChartCF1 = ref()
const RefGChartCF2 = ref()
const RefCChartCF1 = ref()
const RefCChartCF2 = ref()

const updateTable = () => {
  nextTick(() => {
    tableCons1.value?.updateTable()
    tableCons2.value?.updateTable()
    tableOil1.value?.updateTable()
    tableOil2.value?.updateTable()
    tableGas1.value?.updateTable()
    tableGas2.value?.updateTable()
  })
}

const updateChart = () => {
  nextTick(() => {
    RefCChartCF1.value?.updateChart()
    RefCChartCF2.value?.updateChart()
    RefOChartCF1.value?.updateChart()
    RefOChartCF2.value?.updateChart()
    RefGChartCF1.value?.updateChart()
    RefGChartCF2.value?.updateChart()
  })
}

const loadCF = async () => {
  isLoading.value = true

  // clear data
  OilOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(34).fill(null)]))))
  GasOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(34).fill(null)]))))
  ConstOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(35).fill(null)]))))
  try {
    const { status, result } = await useHTTP().put({
      path: 'calc_cf',
      body: {
        type: PyscConf.dataGConf.type_of_contract,
        json: btoa(JSON.stringify(useDataStore().curCase2Json())),
      },
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }
    if (!(isObject(result) && !isEmpty(result)))
      throw "Error Calculation"

    const MapDataCF = (output: Pysc.TableCFOption, mode: 'O' | 'G' | 'C', data: any, isCR: boolean = true) => {
      const keyMapTmpl = JSON.parse(JSON.stringify(PyscConf.dataGConf.type_of_contract === 0
        ? pyKeyOfTable.filter(k => (mode === 'O' ? k.bp_o : (mode === 'G' ? k.bp_g : k.bp_cons)) === 1)
        : (isCR ? pyKeyOfTable.filter(k => (mode === 'O' ? k.cr_o : (mode === 'G' ? k.cr_g : k.cr__cons)) === 1) : pyKeyOfTable.filter(k => (mode === 'O' ? k.gs_o : (mode === 'G' ? k.gs_g : k.gs_cons)) === 1))))

      output.headers.splice(0, output.headers.length, ...keyMapTmpl.map(r => r.name))

      const keyMapData = ['Year', ...Object.keys(data)]
      const DYear = Object.keys(data[keyMapData[1]])

      keyMapTmpl.forEach(k => k.index = keyMapData.findIndex(md => k.keys.includes(md.toLowerCase())))

      // console.log(keyMapTmpl)

      output.data.splice(0, output.data.length,
        ...Array(DYear.length + 1).fill(Array(keyMapData.length).fill(null)).map((row, ir) => {
          if (ir === DYear.length) {
            return row.map((col, ic) => {
              if (ic > 0 && keyMapTmpl[ic].total && keyMapTmpl[ic].index !== -1) {
                if (keyMapTmpl[ic].total === 'sum')
                  return Object.values(data[keyMapData[keyMapTmpl[ic].index]]).reduce((total: number, current) => total + Number(Pysc.is_number(current) ? current : 0), 0)
                else if (keyMapTmpl[ic].total === 'last')
                  return data[keyMapData[keyMapTmpl[ic].index]][DYear[DYear.length - 1]]
              }

              return col
            })
          }

          return row.map((col, ic) => {
            if (ic === 0)
              return +DYear[ir]
            else return keyMapTmpl[ic].index !== -1 ? data[keyMapData[keyMapTmpl[ic].index]][DYear[ir]] : 0
          })
        }))

      output.columns.splice(0, output.columns.length,
        ...Array(keyMapData.length).fill({}).map((col, i) => {
          if (i === 0)
            return { type: 'numeric', numericFormat: { pattern: '0' } }
          else
            return { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } } }
        }))
      output.cells.splice(0, output.cells.length,
        ...Array(keyMapData.length).fill({}).map((col, i) => {
          return { row: DYear.length, col: i, className: 'Row-Sum font-weight-bold' }
        }))
    }

    // update table
    if (PyscConf.dataGConf.type_of_contract <= 3) {
      MapDataCF(OilOpt.value[0], 'O', result.oil, PyscConf.dataGConf.type_of_contract === 1)
      if (PyscConf.prodHasGas())
        MapDataCF(GasOpt.value[0], 'G', result.gas, PyscConf.dataGConf.type_of_contract === 1)
      MapDataCF(ConstOpt.value[0], 'C', result.consolidated, PyscConf.dataGConf.type_of_contract === 1)
    }
    else {
      MapDataCF(OilOpt.value[0], 'O', result.contract_1.oil, [3, 4].includes(PyscConf.dataGConf.type_of_contract))
      if (PyscConf.prodHasGas())
        MapDataCF(GasOpt.value[0], 'G', result.contract_1.gas, [3, 4].includes(PyscConf.dataGConf.type_of_contract))
      MapDataCF(ConstOpt.value[0], 'C', result.contract_1.consolidated, [3, 4].includes(PyscConf.dataGConf.type_of_contract))

      MapDataCF(OilOpt.value[1], 'O', result.contract_2.oil, [3, 6].includes(PyscConf.dataGConf.type_of_contract))
      if (PyscConf.prodHasGas())
        MapDataCF(GasOpt.value[1], 'G', result.contract_2.gas, [3, 6].includes(PyscConf.dataGConf.type_of_contract))
      MapDataCF(ConstOpt.value[1], 'C', result.contract_2.consolidated, [3, 6].includes(PyscConf.dataGConf.type_of_contract))
    }

    updateTable()
    updateChart()
  }
  catch (err) {
    console.log(err)
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result ? err.result : (err?.error ? err.error : 'unknown'))}`,
      isalert: true,
    })
  }
  isLoading.value = false
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("cf trigger")
  nextTick(() => loadCF())
})

onMounted(() => {
  CallableFunc()
})
onUnmounted(() => {
  stopCaseID()
})

const currentTab = ref(0)

watch(currentTab, val => {
  if (val === 1)
    updateChart()
  else
    updateTable()
})

const dataCombineChart = computed(() => {
  let _dataCh = []
  try {
    _dataCh = ConstOpt.value[0].data.map((row, i) => [row[0], ...add(row.slice(-3), ConstOpt.value[1].data[i].slice(-3))])
  }
  catch (error) {
  }

  const _out: Pysc.TableCFOption = {
    data: _dataCh,
    headers: [],
    columns: [],
    cells: [],
  }

  return _out
})
</script>

<template>
  <VCard
    :Loading="isLoading ? 'primary' : false"
    :title="$t('Cashflow')"
    :subtitle="$t('Summary')"
  >
    <VCardText>
      <VTabs v-model="currentTab">
        <VTab>{{ $t('Table') }}</VTab>
        <VTab>{{ $t('Chart') }}</VTab>
      </VTabs>
      <VCardText class="px-1">
        <VWindow v-model="currentTab">
          <VWindowItem value="0">
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <TableCF
                  ref="tableCons1"
                  v-model="tableCollapsed[2][0]"
                  title="Consolidated"
                  :data-table="const_ctr1"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <TableCF
                  ref="tableCons2"
                  v-model="tableCollapsed[2][1]"
                  title="Consolidated"
                  :data-table="const_ctr2"
                  multi-contract
                  is-contract2
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <TableCF
                  ref="tableOil1"
                  v-model="tableCollapsed[0][0]"
                  title="Oil/Condensate"
                  :data-table="oil_ctr1"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <TableCF
                  ref="tableOil2"
                  v-model="tableCollapsed[0][1]"
                  title="Oil/Condensate"
                  :data-table="oil_ctr2"
                  multi-contract
                  is-contract2
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible
              v-if="PyscConf.prodHasGas()"
              :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]"
            >
              <template #left="{ collapsible, collapsed }">
                <TableCF
                  ref="tableGas1"
                  v-model="tableCollapsed[1][0]"
                  title="Gas"
                  :data-table="gas_ctr1"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <TableCF
                  ref="tableGas2"
                  v-model="tableCollapsed[1][1]"
                  title="Gas"
                  :data-table="gas_ctr2"
                  multi-contract
                  is-contract2
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
          </VWindowItem>
          <VWindowItem value="1">
            <ColCollapsible
              v-if="PyscConf.dataGConf.type_of_contract >= 3"
              :col-ratio="[100, 0]"
            >
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefCChartCF1"
                  title="Consolidated CashFlow"
                  :data-chart="dataCombineChart"
                  type="Cons"
                  contract-type="CR"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefCChartCF1"
                  title="Consolidated CashFlow"
                  :data-chart="const_ctr1"
                  type="Cons"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="PyscConf.dataGConf.type_of_contract === 0 ? 'BASE' : ([1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS')"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <ChartCF
                  ref="RefCChartCF2"
                  title="Consolidated CashFlow"
                  :data-chart="const_ctr2"
                  type="Cons"
                  multi-contract
                  is-contract2
                  :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefOChartCF1"
                  title="Oil/Condensate CashFlow"
                  :data-chart="oil_ctr1"
                  type="Oil"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="PyscConf.dataGConf.type_of_contract === 0 ? 'BASE' : ([1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS')"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <ChartCF
                  ref="RefOChartCF2"
                  title="Oil/Condensate CashFlow"
                  :data-chart="oil_ctr2"
                  type="Oil"
                  multi-contract
                  is-contract2
                  :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible
              v-if="PyscConf.prodHasGas()"
              :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]"
            >
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefGChartCF1"
                  title="Gas CashFlow"
                  :data-chart="gas_ctr1"
                  type="Gas"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="PyscConf.dataGConf.type_of_contract === 0 ? 'BASE' : ([1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS')"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <ChartCF
                  ref="RefGChartCF2"
                  title="Gas CashFlow"
                  :data-chart="gas_ctr2"
                  type="Gas"
                  multi-contract
                  is-contract2
                  :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCardText>
  </VCard>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";

td.Row-Sum {
  background-color: #b1bec5;
}

.date-picker-wrapper {
  inline-size: 10.5rem;
}

#apex-chart-wrapper {
  .v-card-item__append {
    padding-inline-start: 0;
  }
}
</style>

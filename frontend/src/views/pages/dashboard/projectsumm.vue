<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { isNaN, isNull } from "mathjs"
import { VCard } from "vuetify/lib/components/index.mjs"
import DotdotOpt from "@/pages/components/dotdotOpt.vue"
import { usePyscConfStore } from '@/stores/genfisStore'
import * as Pysc from "@/utils/pysc/pyscType"

// import { irr } from "financial";

interface Props {
  ctrType: number
  isLoading: boolean
  data: object | null
  dataSplit?: object | null
}
const props = defineProps<Props>()

const { locale } = useI18n({ useScope: 'global' })
const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const numbro = Pysc.useNumbro()

const curSelCaseName = computed(() => {
  if (appStore.projects.length !== -1) {
    const idx = appStore.projects.findIndex(v => v.id === appStore.curSelCase)

    return idx !== -1 ? appStore.projects[idx].name : null
  }

  return null
})

const opened = ref([1, 2, 3, 4, 5, 6, 7])

const makePrettyNum = (val: number | undefined | null, isPercent: boolean = false) => {
  if (typeof val === 'number' && !isNaN(val) && !isNull(val))
    return Pysc.fmtNumber(val * (isPercent ? 100 : 1), true)

  return "-"
}

const summText = ref('')
const { copy: copySumm, copied: summCopied } = useClipboard({ source: summText })

const copysummary = () => {
  summText.value = props.data?.reduce((txt, item) => {
    let _resTxt = `${txt + item.param.replace('\t', '')}\t${item.unit ?? ''}\t${item.ctrl ?? ''}` + `\n`
    if (item.child) {
      _resTxt += item.child.reduce((txt2, item2) => {
        return `${txt2 + item2.param.replace('\t', '')}\t${item2.unit ?? ''}\t${item2.ctrl ?? ''}` + `\n`
      }, '')
    }

    return _resTxt
  }, '')
  if (typeof summText.value === 'string' && summText.value.length)
    copySumm()
}

const isSplitInfoExist = computed(() => (props.dataSplit && props.ctrType === 2) || (props.ctrType > 3 && props.dataSplit && (props.dataSplit.contract_1 || props.dataSplit.contract_2)))
const isSplitDialogVisible = ref(false)
const wShowCtr = ref(1)

const checkColumnRender = (instance, td, row, col, prop, value, cellProperties) => {
  if (!td.classList.contains('htCenter'))
    td.classList.add('htCenter')
  td.innerHTML = value === 1 ? `<i class="tabler-checks v-icon notranslate v-theme--dark text-success" aria-hidden="true" style="font-size: 18px; height: 18px;"></i>` : ''

  return td
}

const { TabelContainer: TabelContainer1, hotTableRef: refTableSplitInfo1, hotInstance: hotInstance1, htTblSett: mainSetting1, updateData: updateData1 } = useHTtable({
  data: [],
  nestedHeaders: [
    ['', { label: 'Base Split', colspan: 2 }, { label: 'Contractor Split', colspan: 2 }, { label: 'Progressive Split', colspan: 2 }, '', { label: 'Year of max. split', colspan: 2 }],
    ['year', 'Oil', 'Gas', 'Oil', 'Gas', 'Oil', 'Gas', 'Variable Split', 'Oil', 'Gas'],
  ],
  columns: [
    { type: 'numeric' },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },

    { renderer: checkColumnRender },
    { renderer: checkColumnRender },
  ],
  readOnly: true,
  rowHeaders: false,
  height: '380px',
  stretchH: 'none',
}, 'none')

const { TabelContainer: TabelContainer2, hotTableRef: refTableSplitInfo2, hotInstance: hotInstance2, htTblSett: mainSetting2, updateData: updateData2 } = useHTtable({
  data: [],
  nestedHeaders: [
    ['', { label: 'Base Split', colspan: 2 }, { label: 'Contractor Split', colspan: 2 }, { label: 'Progressive Split', colspan: 2 }, '', { label: 'Year of max. split', colspan: 2 }],
    ['year', 'Oil', 'Gas', 'Oil', 'Gas', 'Oil', 'Gas', 'Variable Split', 'Oil', 'Gas'],
  ],
  columns: [
    { type: 'numeric' },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },
    { type: 'numeric', numericFormat: { pattern: { thousandSeparated: false, mantissa: 2, output: 'percent', negative: "parenthesis" } } },

    { renderer: checkColumnRender },
    { type: checkColumnRender },
  ],
  readOnly: true,
  rowHeaders: false,
  height: '380px',
  stretchH: 'none',
}, 'none')

const showSplitInfo = () => {
  if (props.ctrType === 2) {
    const _data = props.dataSplit

    wShowCtr.value = 1
    isSplitDialogVisible.value = true
    nextTick(() => updateData1(
      _data?.years.map((y, i) => [
        y,
        _data.oil_base_split[i],
        _data.gas_base_split[i],
        _data.oil_ctr_split[i],
        _data.gas_ctr_split[i],
        _data.oil_prog_split[i],
        _data.gas_prog_split[i],
        _data.var_split_array[i],
        _data.oil_max_split[i],
        _data.gas_max_split[i],
      ]),
    ))
  }
  else {
    wShowCtr.value = [5, 6].includes(props.ctrType) ? 1 : 2
    isSplitDialogVisible.value = true

    const _data = [props.dataSplit.contract_1, props.dataSplit.contract_2]

    nextTick(() => {
      _data.forEach((_d, i) => {
        const updDt = i === 0 ? updateData1 : updateData2

        updDt(
          _d?.years.map((y, i) => [
            y,
            _d.oil_base_split[i],
            _d.gas_base_split[i],
            _d.oil_ctr_split[i],
            _d.gas_ctr_split[i],
            _d.oil_prog_split[i],
            _d.gas_prog_split[i],
            _d.var_split_array[i],
            _d.oil_max_split[i],
            _d.gas_max_split[i],
          ]))
      })
    })
  }
}

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' },
  { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' },
]

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [
    [null, 'BaseSplit', null, 'Contractor Split', null, 'Progressive Split', null, null, 'Year of max split'],
    ['Year', 'Oil', 'Gas', 'Oil', 'Gas', 'Oil', 'Gas', 'Variable Split', 'Oil', 'Gas'],
    ...(wShowCtr.value === 1 ? (hotInstance1.value?.getData()) : (hotInstance2.value?.getData())),
  ]

  if (tblDataScr && tblDataScr.length) {
    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

      return {
        data: [{
          name: 'Split Info',
          header: [],
          data: tblDataScr,
        }],
        filename: `splitInfo_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

onMounted(() => {
  // opened.value = [1, 2, 3, 4, 5, 6, 7]
  // console.log(irr(
  //   [-9.56356385, -17.19228277, -4.1974023, 21.51028172, 20.37660873,
  //     22.00019468, 19.00201212, 14.96119589, 12.40045711, 10.58772474,
  //     10.58777014, 10.33827069, 8.88270196, 8.95418192, 7.43110387,
  //     6.74040839, 5.93121733, 5.27936182, 4.66542023, 3.75564767,
  //     2.87979519, 0.98801818, 0.63002326, 0.44646363, 0.35741839,
  //     0.58235915, 0.37064161, 0.23568187,]
  // ))
})
</script>

<template>
  <VCard
    :loading="props.isLoading ? 'primary' : false"
    title="Executive Summary"
    :subtitle="$t('Summary of ', [$t(curSelCaseName ?? 'case')])"
  >
    <template #append>
      <IconBtn
        v-if="isSplitInfoExist"
        @click.stop="showSplitInfo"
      >
        <VIcon
          size="28"
          icon="tabler-arrows-split-2"
          color="success"
          style="transform: rotate(90deg);"
        />
        <VTooltip
          activator="parent"
          location="top"
        >
          Contractor Split Information
        </VTooltip>
      </IconBtn>
      <IconBtn @click="copysummary">
        <VIcon
          size="28"
          :icon="summCopied ? 'tabler-copy-check-filled' : 'tabler-clipboard-copy'"
          :color="summCopied ? 'success' : undefined"
        />
        <VTooltip
          activator="parent"
          location="top"
        >
          {{ summCopied ? 'Copied' : 'Copy summary to Clipboard' }}
        </VTooltip>
      </IconBtn>
    </template>
    <VList
      v-model:opened="opened"
      density="compact"
    >
      <div v-for="(item, index) in props.data">
        <VListGroup
          v-if="item.grp"
          :value="item.grp"
          border
        >
          <template #activator="{ props }">
            <VListItem
              v-bind="props"
              class="v-list-item--active"
            >
              <VListItemTitle class="d-flex">
                <span
                  class="text-end me-2"
                  :style="{ width: '24px' }"
                >{{ index + 1
                }}.</span>{{ item.param }}
              </VListItemTitle>
              <template
                v-if="item.unit"
                #append
              >
                <div class="d-flex justify-end">
                  <span
                    class="text-end me-3"
                    v-html="makePrettyNum(item.ctrl, item.unit === '%')"
                  />
                  <span
                    class="text-start"
                    :style="{ width: '110px' }"
                  >{{ item.unit }}</span>
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    {{ `${item.param} ${item.unit} :` }}<br>
                    {{ typeof item.ctrl === 'number' ? (item.ctrl * (item.unit === '%' ? 100 : 1)) : '-' }}
                  </VTooltip>
                </div>
              </template>
            </VListItem>
          </template>
          <VListItem
            v-for="child in item.child"
            :key="`${child.param}`"
            border
          >
            <VListItemTitle :style="{ 'margin-left': '18px' }">
              {{ child.param }}
            </VListItemTitle>
            <template #append>
              <div class="d-flex justify-end">
                <span
                  class="text-end me-3"
                  v-html="makePrettyNum(child.ctrl, child.unit === '%')"
                />
                <span
                  class="text-start"
                  :style="{ width: '110px' }"
                >{{ child.unit }}</span>
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  {{ `${child.param} ${child.unit} :` }}<br>
                  {{ typeof child.ctrl === 'number' ? (child.ctrl * (child.unit === '%' ? 100 : 1)) : '-' }}
                </VTooltip>
              </div>
            </template>
          </VListItem>
        </VListGroup>
        <VListItem
          v-else
          :border="index + 1 !== 14"
          :class="{ 'mt-10': index + 1 === 14 }"
          :style="{ 'border-top': index + 1 === 14 ? '1px double rgba(var(--v-border-color), 0.8)' : undefined }"
        >
          <VListItemTitle class="d-flex">
            <span
              class="text-end me-2"
              :style="{ width: '24px' }"
            >{{ index + 1 === 14 ? '' : `${index + 1}.` }}</span>{{ item.param }}
          </VListItemTitle>
          <template #append>
            <div class="d-flex justify-end">
              <span
                class="text-end me-3"
                v-html="makePrettyNum(item.ctrl, item.unit === '%')"
              />
              <span
                class="text-start"
                :style="{ width: '110px' }"
              >{{ item.unit }}</span>
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ `${item.param} ${item.unit} :` }}<br>
                {{ typeof item.ctrl === 'number' ? (item.ctrl * (item.unit === '%' ? 100 : 1)) : '-' }}
              </VTooltip>
            </div>
          </template>
        </VListItem>
      </div>
    </VList>
    <VDialog
      v-model="isSplitDialogVisible"
      style="max-width: 64.375rem;"
    >
      <DialogCloseBtn @click="isSplitDialogVisible = false" />
      <VCard title="Contractor Split Information">
        <template #append>
          <DotdotOpt
            :menu-list="optOption"
            title="Options"
            item-props
            :get-source="getDataSource"
          />
        </template>
        <VCardText class="py-0">
          <VTabs
            v-if="props.ctrType !== 2"
            v-model="wShowCtr"
          >
            <VTab
              :value="1"
              :disabled="props.ctrType === 4"
            >
              Contract 1
            </VTab>
            <VTab
              :value="2"
              :disabled="props.ctrType === 6"
            >
              Contract 2
            </VTab>
          </VTabs>
          <VWindow v-model="wShowCtr">
            <VWindowItem :value="1">
              <VCardText
                ref="TabelContainer1"
                class="px-0"
              >
                <HotTable
                  ref="refTableSplitInfo1"
                  :settings="mainSetting1"
                  license-key="non-commercial-and-evaluation"
                />
              </VCardText>
            </VWindowItem>
            <VWindowItem :value="2">
              <VCardText
                ref="TabelContainer2"
                class="px-0"
              >
                <HotTable
                  ref="refTableSplitInfo2"
                  :settings="mainSetting2"
                  license-key="non-commercial-and-evaluation"
                />
              </VCardText>
            </VWindowItem>
          </VWindow>
        </VCardText>
      </VCard>
    </VDialog>
  </VCard>
</template>

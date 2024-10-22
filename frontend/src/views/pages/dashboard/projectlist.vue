<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { useHTTP } from "@/utils/pysc/useHttp"
import { isNaN } from "mathjs"
import { useDraggable } from 'vue-draggable-plus'
import ProjectEditor from "./AddNewProject.vue"

// import DirDialogs from "@/views/components/fileDialogs/dirDialogs.vue"
import CardCombine from './caseCombine.vue'
import CardCompare from './caseCompare.vue'
import CardIncremental from "./caseIncremental.vue"
import ConfirmDialogs from "@/layouts/components/pysc/ConfirmDialogs.vue"
import { usePyscConfStore } from '@/stores/genfisStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDayJs } from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import SelCases from "@/views/components/selCases.vue"

const router = useRouter()
const appStore = useAppStore()
const PyscConf = usePyscConfStore()

const dayjs = useDayJs()

const isLoading = ref(false)

const { projects: listProject, curSelCase } = storeToRefs(appStore)

const isEditorDrawerVisible = ref(false)
const RefProjEditor = ref<any>(null)

const isEditTitleShow = ref(false)
const isEdittingId = ref()
const editValue = ref()

interface TsortList {
  key: string | null
  order?: 'asc' | 'desc' | undefined
}

const updateEditValue = (item, newValue) => {
  if (!isEmpty(newValue)) {
    appStore.$patch(state => {
      const _index = state.projects.findIndex(v => v.id === item.id)
      if (_index !== -1)
        state.projects[_index].name = newValue
    })
  }
  isEditTitleShow.value = false
  isEdittingId.value = undefined
}

const { t, locale } = useI18n({ useScope: 'global' })

// const headers = computed(() => [
//   { title: "", key: "ctrldata", align: 'start', width: 48 },
//   { title: t("Name"), key: "name", align: 'start' },
//   { title: t("Type"), key: "type", align: 'start', value: item => Object.values(Pysc.ContractType)[Number.parseInt(item.type)] },
//   { title: t("Updated at"), key: "updated_at", align: 'center', value: item => dayjs.utc(item.updated_at).local().format("lll") },
// ])

const updateProject = async (param: Pysc.ProjectBase) => {
  isLoading.value = true

  const isNew = param.id === null

  param.updated_at = dayjs.utc().valueOf()
  if (isNew) {
    param.id = Math.floor(Math.random() * (2000000 - 1000)) + 1000
    await useDataStore().addCase(param)
  }
  else if (param.id < 0) {
    const idx = appStore.projects.findIndex(e => e.id === Math.abs(param.id))

    // clone
    param.id = Math.floor(Math.random() * (2000000 - 1000)) + 1000
    await useDataStore().cloneCase(param, appStore.projects[idx].id)
  }
  else {
    // update
    await useDataStore().updateCase(param)
  }
  isLoading.value = false
}

// const SelLocImportRef = ref()
const selCasesDialogs = ref()
const cardCompare = ref()
const cardCombine = ref()
const cardIncr = ref()

const updateSelImportPath = async (value: string) => {
  // console.log(value)
  try {
    const { status, result } = await useHTTP().get({
      path: 'getcases',
      params: { path: btoa(value) },
      onError: (error: any) => { throw error },
    })

    if (status !== 200 || result.state !== true)
      throw { status, result: "Invalid file type or it's an old file" }

    // show select cases
    // console.log(resInit)
    selCasesDialogs.value?.ShowCaseDialogs(value, result.cases)
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })
  }
}

const postImportData = async (param: Pysc.selImprCases) => {
  isLoading.value = true

  await useDataStore().importFrPySC(param.path, param.caseID)

  isLoading.value = false
}

const moreprojList = [
  { title: "New Case", value: "newproj" }, //
  {
    title: "Import",
    value: "importproj",
    child: [
      { title: "From .psc", value: "imppysc" },
      { title: "From JSON", value: "impjson" },
    ],
  },
  { title: "Case comparison", value: "compare" },
  { title: "Case combine", value: "combine" },
  { title: "Case incremental", value: "incremental" },
]

const isCompareDlgVisible = ref(false)
const isCombineDlgVisible = ref(false)
const isIncrDlgVisible = ref(false)

const showCompare = (id: number) => {
  if (appStore.projects.length === 1)
    return
  isCompareDlgVisible.value = true
  nextTick(() => cardCompare.value?.showCaseCompare(id))
}

const showCombine = (id: number) => {
  if (appStore.projects.length === 1)
    return
  isCombineDlgVisible.value = true
  nextTick(() => cardCombine.value?.showCaseCombine(id))
}

const showIncr = (id: number) => {
  if (appStore.projects.length === 1)
    return
  isIncrDlgVisible.value = true

  nextTick(() => cardIncr.value?.showCaseIncr(id))
}

const projectMenuClick = key => {
  if (key === "newproj")
    RefProjEditor.value.OpenEditor()

  else if (key === "imppysc")
    appStore.showFileDialog(updateSelImportPath, 'open', !isEmpty(appStore.curProjectPath) ? appStore.curProjectPath?.split(/\/|\\/).slice(0, -1).join(appStore.osConf.sep) : null)

  else if (key === "compare")
    showCompare(appStore.curSelCase)

  else if (key === "combine")
    showCombine(appStore.curSelCase)

  else if (key === "incremental")
    showIncr(appStore.curSelCase)
}

const moreTabData = [
  { title: "New Case", value: "new" },
  { title: "Duplicate", value: "clone" },
  { title: "Remove", value: "delete" },
  { type: 'divider' },
  { title: "Case comparison", value: "compare" },
  { title: "Case combine", value: "combine" },
  { title: "Case incremental", value: "incremental" },
  { type: 'divider' },
  { title: "Properties", value: "edit" },
]

const isShowConfirmDelete = ref(false)
const caseDeleteID = ref({ id: 0, name: '' })

const deleteCase = async () => {
  await useDataStore().delCase(caseDeleteID.value.id)
}

const TabMenuDataClicked = async (key: string, item: any) => {
  if (key === 'new') {
    RefProjEditor.value.OpenEditor()
  }
  else if (key === 'edit' || key === 'clone') {
    RefProjEditor.value.OpenEditor({
      id: key === 'clone' ? -item.id : item.id,
      name: item.name,
      description: item.description,
      type: item.type,
      state: item.state,
      multicase: JSON.parse(JSON.stringify(item.multicase)),
      updated_at: dayjs.utc(item.updated_at).valueOf(),
      evaluator: (item.evaluator ?? ""),
      evaluator_date: (item.evaluator_date ?? dayjs.utc().valueOf()),
    })
  }
  else if (key === 'delete') {
    if (appStore.projects.length === 1)
      return
    caseDeleteID.value = { id: +item.id, name: item.name }
    isShowConfirmDelete.value = true
  }
  else if (key === 'compare') {
    showCompare(+item.id)
  }
  else if (key === 'combine') {
    showCombine(+item.id)
  }

  else if (key === 'incremental') {
    showIncr(+item.id)
  }
}

const ListProjDrag = ref()

const projSort = ref<TsortList>({
  key: null,
  order: undefined,
})

const changeActiveCase = item => {
  if (curSelCase.value !== item.id)
    curSelCase.value = item.id
}

const updateDragAble = () => {
  if (ListProjDrag.value) {
    const draggable = useDraggable(ListProjDrag, listProject, {
      animation: 500,
      handle: ".list-drag-handle",
      direction: 'vertical',
      onStart() {
      },
      onUpdate() {
        projSort.value = { key: null, order: undefined }
      },
    })
  }
}

const updateSorted = () => {
  appStore.$patch(state => {
    const keyContracts = Object.values(Pysc.ContractType)

    state.projects.sort((a, b) => {
      if (projSort.value.key === 'name') {
        if (projSort.value.order === 'desc')
          return b.name.toLowerCase().localeCompare(a.name.toLowerCase())
        else
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      }
      else if (projSort.value.key === 'type') {
        if (projSort.value.order === 'desc') {
          return keyContracts[isNaN(+b.type) ? 0 : (+b.type)].toLowerCase()
            .localeCompare(keyContracts[isNaN(+a.type) ? 0 : (+a.type)].toLowerCase())
        }
        else {
          return keyContracts[isNaN(+a.type) ? 0 : (+a.type)].toLowerCase()
            .localeCompare(keyContracts[isNaN(+b.type) ? 0 : (+b.type)].toLowerCase())
        }
      }
      else if (projSort.value.key === 'updated_at') {
        if (projSort.value.order === 'desc')
          return b.updated_at - a.updated_at
        else
          return a.updated_at - b.updated_at
      }
    })
  })
}

const handleHeaderLeave = ev => {
  const el_ = ev.target.querySelector('.icon-sort')
  if (!ev.target.classList.contains('column-sorted')) {
    if (el_.classList.contains('tabler-arrow-down'))
      el_.classList.remove('tabler-arrow-down')
    if (el_.classList.contains('tabler-arrow-up'))
      el_.classList.remove('tabler-arrow-up')
  }
}

const handleHeaderHover = ev => {
  const el_ = ev.target.querySelector('.icon-sort')
  if (!el_.classList.contains('tabler-arrow-down') && !el_.classList.contains('tabler-arrow-up'))
    el_.classList.add('tabler-arrow-down')
}

const handleClickSort = (ev, key) => {
  ev.stopImmediatePropagation()
  ev.preventDefault()

  const el_ = (ev.target.classList.contains('v-icon') ? ev.target : (ev.target.classList.contains('h-title') ? ev.target.nextSibling : ev.target.querySelector('.icon-sort')))
  const order = projSort.value.key !== key ? 'asc' : (projSort.value.order === 'desc' ? 'asc' : 'desc')

  projSort.value = { key, order }

  nextTick(() => updateSorted())
}

watch(locale, val => {
})

onMounted(() => {
  nextTick(() => updateDragAble())
})
</script>

<template>
  <VCard
    :title="$t('My Project')"
    :subtitle="$t('List of ', [$t('case')])"
    :loading="isLoading ? 'primary' : false"
  >
    <template #prepend>
      <div class="mt-n4 me-n2">
        <IconBtn>
          <VIcon icon="tabler-dots-vertical" />
          <VMenu
            activator="parent"
            offset="14px"
          >
            <VList>
              <VListItem
                v-for="(item) in moreprojList"
                :key="item.title"
                :value="item.value"
                :title="item.title"
                @click="() => projectMenuClick(item.value)"
              >
                <VMenu
                  v-if="item.child"
                  activator="parent"
                  :offset="[14, 20]"
                  location="end"
                >
                  <VList>
                    <VListItem
                      v-for="(child) in item.child"
                      :key="child.title"
                      :value="child.value"
                      :title="child.title"
                      @click="() => projectMenuClick(child.value)"
                    />
                  </VList>
                </VMenu>
              </VListItem>
            </VList>
          </VMenu>
        </IconBtn>
      </div>
    </template>
    <!-- 👉 Data Table  -->
    <VTable
      class="projlists"
      hover
      fixed-header
      style="max-block-size: 23.75rem;"
    >
      <thead>
        <tr>
          <td style="inline-size: 80px;" />
          <td
            v-for="(item, index) in [{ title: 'name', value: 'name' }, { title: 'Contract Type', value: 'type' }, { title: 'Updated at', value: 'updated_at' }]"
            :key="`head-${item.value}`"
          >
            <div
              class="d-flex align-center"
              :class="{ 'column-sorted': projSort.key === item.value }"
              style="cursor: pointer;"
              @mouseenter="handleHeaderHover"
              @mouseleave="handleHeaderLeave"
              @click="(ev) => handleClickSort(ev, item.value)"
            >
              <span class="h-title">{{ item.title }}</span>
              <VIcon
                class="icon-sort ms-2"
                color="primary"
                size="small"
                :icon="projSort.key === item.value ? (projSort.order === 'desc' ? 'tabler-arrow-up' : 'tabler-arrow-down') : undefined"
              />
            </div>
          </td>
        </tr>
      </thead>
      <tbody ref="ListProjDrag">
        <tr
          v-for="(item, index) in appStore.projects"
          :key="`tr-case-${item.id}`"
          :class="{ 'case-active': item.id === appStore.curSelCase }"
          :style="{ backgroundColor: item.id === appStore.curSelCase ? 'rgba(var(--v-theme-on-surface), 0.25)' : undefined }"
        >
          <td
            class="d-flex align-center"
            style="inline-size: 80px;"
          >
            <VIcon
              class="list-drag-handle"
              :style="{ cursor: 'ns-resize' }"
              icon="tabler-arrows-move-vertical"
            />
            <MoreBtn
              :menu-list="moreTabData"
              item-props
              @click:item="(val) => TabMenuDataClicked(val, item)"
            />
          </td>
          <td
            class="text-truncate cursor-pointer flex-grow-0"
            @click="() => changeActiveCase(item)"
          >
            <VTextField
              v-if="isEditTitleShow && isEdittingId === item.id"
              v-model="editValue"
              density="compact"
              variant="underlined"
              class="me-5"
              autofocus
              @blur="isEditTitleShow = false"
              @keyup.esc="isEditTitleShow = false"
              @keyup.enter="() => updateEditValue(item, editValue)"
            />
            <span
              v-else
              @dblclick="() => { editValue = item.name; isEdittingId = item.id; isEditTitleShow = true; }"
            >

              {{ item.name }}
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ item.name }}<br>
                <span v-html="item.description" /><br>
                <span class="text-warning">Double click to edit text</span>
              </VTooltip>
            </span>
            <div class="text-truncate text-body-2">
              {{ item.description?.replace("/\n|\r/g", " ").replace("<br>", "").replace("</br>", "") }}
            </div>
          </td>
          <td
            class="text-h6 text-truncate"
            style="inline-size: 210px;"
          >
            <h5>
              {{ Object.values(Pysc.ContractType)[isNaN(+item.type) ? 0 : (+item.type)] }}
            </h5>
          </td>
          <td
            class="text-h6 text-truncate"
            style="inline-size: 180px;"
          >
            <h5>
              {{ dayjs.utc(item.updated_at).local().locale(locale).format("lll") }}
            </h5>
            <h6 class="text-body-3">
              @{{ typeof item.evaluator === 'string' && item.evaluator.length ? item.evaluator : 'unknown' }}
            </h6>
          </td>
        </tr>
      </tbody>
    </VTable>
  </VCard>
  <ProjectEditor
    ref="RefProjEditor"
    v-model:isDrawerOpen="isEditorDrawerVisible"
    @update:proj-data="updateProject"
  />
  <ConfirmDialogs
    v-model:is-show="isShowConfirmDelete"
    :msg="`Do you want to remove case '${caseDeleteID.name}' ?`"
    @confirm="deleteCase"
  />
  <!-- <DirDialogs ref="SelLocImportRef" @update:path="updateSelImportPath" /> -->
  <SelCases
    ref="selCasesDialogs"
    @update:importcase="postImportData"
  />
  <CardCompare
    v-if="isCompareDlgVisible"
    ref="cardCompare"
    @compare-dlg-done="() => nextTick(() => isCompareDlgVisible = false)"
  />
  <CardCombine
    v-if="isCombineDlgVisible"
    ref="cardCombine"
    @combine-dlg-done="() => nextTick(() => isCombineDlgVisible = false)"
  />
  <CardIncremental
    v-if="isIncrDlgVisible"
    ref="cardIncr"
    @incr-dlg-done="() => nextTick(() => isIncrDlgVisible = false)"
  />
</template>

<style lang="scss" scoped>
.max-w-10 {
  display: inline-block !important;
  overflow: hidden !important;
  max-inline-size: min(32dvw, 435px) !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

tbody tr.v-data-table__selected {
  background: #28485870 !important;
}

tbody tr.v-data-table__selected:hover {
  background: #42769170 !important;
}
</style>

<style lang="scss" scoped>
.projlists {
  thead {
    tr {
      td {
        background: rgb(var(--v-theme-surface));
        border-block-end: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
      }
    }
  }
  td {
      .list-drag-handle {
        color: rgba(var(--v-theme-on-surface), 0.3);
        &:hover {
          color: rgba(var(--v-theme-warning), 0.7)
        }
      }
    }
  }
</style>

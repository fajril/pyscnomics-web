<script setup lang="ts">
import ConfirmDialogs from "@/layouts/components/pysc/ConfirmDialogs.vue";
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from "@/utils/pysc/pyscType";
import { useDayJs } from "@/utils/pysc/pyscType";
import { useDataStore } from '@/utils/pysc/useDataStore';
import dirDialogs from "@/views/components/fileDialogs/dirDialogs.vue";
import selCases from "@/views/components/selCases.vue";
import { VDataTableVirtual } from 'vuetify/labs/VDataTable';
import ProjectEditor from "./AddNewProject.vue";

const router = useRouter()
const appStore = useAppStore()
const PyscConf = usePyscConfStore()

const dayjs = useDayJs()

const isLoading = ref(false)

const { curSelCase } = storeToRefs(appStore)

const selectRow = (e, item) => {
  if (curSelCase.value !== item.id)
    curSelCase.value = item.id
}

const isEditorDrawerVisible = ref(false)
const RefProjEditor = ref<any>(null)

const headers = [
  { title: "", key: "ctrldata", align: 'start', width: 48 },
  { title: "Name", key: "name", align: 'start' },
  { title: "Type", key: "type", align: 'start', value: item => Object.values(Pysc.ContractType)[parseInt(item.type)] },
  { title: "Updated at", key: "updated_at", align: 'center', value: item => dayjs.utc(item.updated_at).local().format("lll") },
]

const updateProject = async (param: Pysc.ProjectBase) => {
  isLoading.value = true
  const isNew = param.id === null
  param.updated_at = dayjs.utc().valueOf()
  if (isNew) {
    param.id = Math.floor(Math.random() * (2000000 - 1000)) + 1000
    await useDataStore().addCase(param)
  } else if (param.id < 0) {
    const idx = appStore.projects.findIndex(e => e.id === Math.abs(param.id))
    //clone
    param.id = Math.floor(Math.random() * (2000000 - 1000)) + 1000
    await useDataStore().cloneCase(param, appStore.projects[idx].id)
  } else {
    //update
    await useDataStore().updateCase(param)
  }
  isLoading.value = false
}

const SelLocImportRef = ref()
const selCasesDialogs = ref()

const updateSelImportPath = async (value: string) => {
  // console.log(value)
  try {
    const resInit = await $api('/auth/getcases', { params: { path: btoa(value) }, method: 'GET' })
    if (resInit.state !== true) throw "Invalid file type or it's an old file"
    //show select cases
    // console.log(resInit)
    selCasesDialogs.value?.ShowCaseDialogs(value, resInit.cases)
  } catch (error) {
    appStore.showAlert({
      text: typeof error === 'string' ? error : 'Error while loading data',
      isalert: true
    })
  }
}

const postImportData = async (param: Pysc.selImprCases) => {
  isLoading.value = true
  const res = await useDataStore().importFrPySC(param.path, param.caseID)
  isLoading.value = false
}

const moreprojList = [
  { title: "New Case", value: "newproj" }, //
  {
    title: "Import", value: "importproj", child: [
      { title: "From .psc", value: "imppysc" },
      { title: "From JSON", value: "impjson" },
    ]
  }, //
]

const projectMenuClick = (key) => {
  if (key === "newproj")
    RefProjEditor.value.OpenEditor()
  else if (key === "imppysc") {
    if (!isEmpty(appStore.curProjectPath))
      SelLocImportRef.value?.loadMyDris("open", appStore.curProjectPath?.split(/\/|\\/).slice(0, -1).join("\\"))
    else
      SelLocImportRef.value?.loadMyDris("open", "__local__")
  }
}

const moreTabData = [
  { title: "New Case", value: "new" },
  { title: "Duplicate", value: "clone" },
  { title: "Remove", value: "delete" },
  { title: "Properties", value: "edit" },
]

const isShowConfirmDelete = ref(false)
const caseDeleteID = ref({ id: 0, name: '' })

const deleteCase = async () => {
  await useDataStore().delCase(caseDeleteID.value.id)
}

const TabMenuDataClicked = async (key: string, item: any) => {
  if (key === 'new')
    RefProjEditor.value.OpenEditor()
  else if (key === 'edit' || key === 'clone') {
    RefProjEditor.value.OpenEditor({
      id: key === 'clone' ? -item.id : item.id,
      name: item.name,
      description: item.description,
      type: item.type,
      state: item.state,
      multicase: JSON.parse(JSON.stringify(item.multicase)),
      updated_at: dayjs.utc(item.updated_at).valueOf(),
    })
  }
  else if (key === 'delete') {
    if (appStore.projects.length === 1) return
    caseDeleteID.value = { id: +item.id, name: item.name }
    isShowConfirmDelete.value = true
  }
}

</script>

<template>
  <VCard title="My Cases" subtitle="List of cases" :loading="isLoading">
    <template #prepend>
      <div class="mt-n4 me-n2">
        <IconBtn>
          <VIcon icon="tabler-dots-vertical" />
          <VMenu activator="parent" offset="14px">
            <VList>
              <VListItem v-for="(item) in moreprojList" :key="item.title" :value="item.value" :title="item.title"
                @click="() => projectMenuClick(item.value)">
                <VMenu v-if="item.child" activator="parent" :offset="[14, 20]" location="end">
                  <VList>
                    <VListItem v-for="(child) in item.child" :key="child.title" :value="child.value"
                      :title="child.title" @click="() => projectMenuClick(child.value)" />
                  </VList>
                </VMenu>
              </VListItem>
            </VList>
          </VMenu>
        </IconBtn>
      </div>
    </template>
    <!-- 👉 Data Table  -->
    <VDataTableVirtual :headers="headers" :items="appStore.projects" item-value="id" density="compact" class="mb-6">
      <template #item="{ index, item, isSelected, toggleSelect }">
        <tr class="v-data-table__tr v-data-table__tr--clickable"
          :class="{ 'v-data-table__selected': curSelCase === +item.id }" @click.prevent="e => selectRow(e, item)">
          <td class="v-data-table__td v-data-table-column--align-start" style="inline-size: 48px;">
            <div class="d-flex justify-center">
              <IconBtn density="compact" color="disabled">
                <VIcon icon="tabler-dots-vertical" />
                <VMenu activator="parent">
                  <VList>
                    <template v-for="mnu in moreTabData" :key="mnu.value">
                      <VListItem @click="() => TabMenuDataClicked(mnu.value, item)">
                        <VListItemTitle>{{ mnu.title }}</VListItemTitle>
                      </VListItem>
                    </template>
                  </VList>
                </VMenu>
              </IconBtn>
            </div>
          </td>
          <td class="v-data-table__td v-data-table-column--align-start" style="inset-inline-start: 48px;">
            <div class="max-w-10">
              <p class="my-0">
                {{ item.name }}
              </p>
              <h5 class="my-0 text-xs text-truncate">
                {{ item.description?.replace("/\n|\r/g", " ").replace("<br>", "").replace("</br>", "") }}
                <VTooltip activator="parent" location="top">
                  {{ item.name }}<br>
                  <span v-html="item.description" />
                </VTooltip>
              </h5>
            </div>
          </td>
          <td class="v-data-table__td v-data-table-column--align-start" style="inset-inline-start: 48px;">{{
            item.type === -1 ? 'Multiple Project' : Object.values(Pysc.ContractType)[parseInt(item.type)] }}</td>
          <td class="v-data-table__td v-data-table-column--align-center" style="inset-inline-start: 48px;">
            {{ dayjs.utc(item.updated_at).local().format("lll") }}</td>
        </tr>
      </template>
    </VDataTableVirtual>
  </VCard>
  <ProjectEditor ref="RefProjEditor" v-model:isDrawerOpen="isEditorDrawerVisible" @update:proj-data="updateProject" />
  <ConfirmDialogs v-model:is-show="isShowConfirmDelete" :msg="`Do you want to remove case '${caseDeleteID.name}' ?`"
    @confirm="deleteCase" />
  <dirDialogs ref="SelLocImportRef" @update:path="updateSelImportPath" />
  <selCases ref="selCasesDialogs" @update:importcase="postImportData" />
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

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { useWSStore } from '@/stores/wsStore';
import { debounceFilter } from '@vueuse/core';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';

interface fileIntf {
  name: string
  type: number
}

interface filepathIntf {
  dir: string | null
  parent: string | null
  filename: string | null
  children: fileIntf[] | null
}

const emit = defineEmits<{
  (e: 'update:path', value: string): void
}>()

const fileMode = ref('open')
const fileExt = ref('psc')
const IsLoading = ref(false)
const itsOverwriteNote = ref(false)
const isDialogVisible = ref(false)
const filePath = ref<string | null>(null)
const childSelected = ref(undefined)
const appStore = useAppStore()
const wsStore = useWSStore()

const childlist = ref<filepathIntf>({
  dir: '',
  parent: null,
  filename: null,
  children: [],
})

const drives = ref<filepathIntf>()
const driveSelected = ref(undefined)

const watchFileEd = watchIgnorable(
  filePath,
  v => {
    fetchDirs(v)
  },
  { eventFilter: debounceFilter(1000) },
)

const watchDriveSel = watchIgnorable(
  driveSelected,
  v => {
    const seldrive = driveSelected.value?.[0]
    watchFileEd.ignoreUpdates(() => {
      if (seldrive) {
        filePath.value = seldrive.name
        fetchDirs(filePath.value)
      } else
        watchDriveSel.ignoreUpdates(() => {
          const curPaths = filePath.value?.split(/\/|\\/)
          const idx = drives.value?.children?.findIndex(d => d.name.toLowerCase() === (curPaths?.[0].toLowerCase() + appStore.osConf.sep))
          driveSelected.value = [drives.value?.children[idx]]
        })
    })
  })
const watchFileSel = watchIgnorable(
  childSelected,
  v => {
    const selitem = childSelected.value?.[0]
    if (selitem) {
      watchFileEd.ignoreUpdates(() => {
        if (typeof selitem === 'object')
          filePath.value = childlist.value.dir + appStore.osConf.sep + selitem.name
        else
          filePath.value = childlist.value.parent
      })
      if (filePath.value?.toLowerCase().indexOf(`.${fileExt.value}`) === -1)
        fetchDirs(filePath.value)
    }
    else
      watchFileEd.ignoreUpdates(() => {
        filePath.value = childlist.value.dir
      })
  },
)

const extractPathResult = (_path: object) => {
  const { dir, parent, children } = _path
  childlist.value = _path
  watchFileEd.ignoreUpdates(() => {
    if (isEmpty(filePath.value)) {
      filePath.value = childlist.value.dir + (childlist.value.filename ? (appStore.osConf.sep + childlist.value.filename) : '')
    }
  })
  if (children) {
    watchFileSel.ignoreUpdates(() => {
      if (filePath.value?.toLowerCase().includes(`.${fileExt.value}`)) {
        const filename = filePath.value?.split(/\/|\\/).slice(-1)[0]
        const idxItem = children.findIndex(v => v.name.toLowerCase() === filename.toLowerCase())
        if (idxItem != -1) {
          childSelected.value = [children[idxItem]]
          return
        }
      }
      childSelected.value = undefined
    })
  } else
    childSelected.value = undefined
  watchDriveSel.ignoreUpdates(() => {
    const curPaths = filePath.value?.split(/\/|\\/)
    const idx = drives.value?.children?.findIndex(d => d.name.toLowerCase() === (curPaths?.[0].toLowerCase() + appStore.osConf.sep))
    driveSelected.value = [drives.value?.children[idx]]
  })
}

const fetchDirs = async (_path: string | null) => {
  IsLoading.value = true
  try {
    wsStore.wseSend(btoa(JSON.stringify({
      module: 'app:dirs',
      id: wsStore.clientIDE,
      data: btoa(JSON.stringify({ flext: fileExt.value, path: _path }))
    })), false)
  }
  catch (error) {
    childlist.value = {
      parent: _path,
      children: null,
    }
  }
}

const applyPath = () => {
  isDialogVisible.value = false
  emit('update:path', filePath.value)
}

const loadMyDris = (mode: string, lookup: string | null) => {
  fileMode.value = mode
  isDialogVisible.value = true
  watchFileEd.ignoreUpdates(() => {
    filePath.value = typeof lookup === 'string' ? lookup : null
  })
  childlist.value = {
    dir: '',
    parent: null,
    filename: null,
    children: [],
  }
  drives.value = {
    dir: '',
    parent: null,
    filename: null,
    children: [],
  }
  //get drive
  wsStore.wseSend(btoa(JSON.stringify({
    module: 'app:drive',
    id: wsStore.clientIDE,
    data: null
  })), false)

  fetchDirs(lookup)
}

const ItsValidPath = computed(() => {
  const isvalidFl = childlist.value.parent != null && childlist.value.parent != '' && filePath.value?.toLowerCase().includes(`.${fileExt.value}`)
  const filename = filePath.value?.split(/\/|\\/).slice(-1)[0]
  const idxItem = childlist.value.children ? childlist.value.children.findIndex(v => v.name === filename) : -1
  if (fileMode.value === 'save') {
    itsOverwriteNote.value = idxItem != -1

    return isvalidFl
  }
  else if (fileMode.value === 'open') {
    return isvalidFl && idxItem != -1
  }

  return false
})

const getIconFile = (type: number) => {
  return type === 0 ? 'tabler-devices-pc' : (type === 1 ? 'tabler-folder' : '')
}

onMounted(() => {
  wsStore.addBroadCast('app:dirs', -1, (msg: any) => {
    const { type, data } = msg.data
    if (type === 'app:drive') {
      drives.value = JSON.parse(atob(data))
    }
    else if (type === 'app:dirs') {
      IsLoading.value = false
      const path_ = JSON.parse(atob(data))
      extractPathResult(path_)
    }
  })
})
onUnmounted(() => {
  wsStore.removeBroadCast('app:dirs', -1)
})

defineExpose({
  loadMyDris,
})
</script>

<template>
  <VDialog v-model="isDialogVisible" persistent class="v-dialog-sm">
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="isDialogVisible = !isDialogVisible" />

    <!-- Dialog Content -->
    <VCard :title="fileMode === 'open' ? 'Open File' : 'Save to File'" :loading="IsLoading">
      <VCardText v-if="!ItsValidPath || (fileMode === 'save' && ItsValidPath && itsOverwriteNote)">
        <VAlert density="comfortable" color="error" variant="tonal">
          {{ (fileMode === 'save' && ItsValidPath && itsOverwriteNote) ? "The file already exists, \
          the save process will overwrite the existing data" : "please entry/select file path" }}
        </VAlert>
      </VCardText>
      <VCardText>
        <VRow no-gutters>
          <VCol cols="12">
            <VTextField v-model="filePath" label="Select Path" variant="outlined" autofocus />
          </VCol>
          <VCol :style="{ maxWidth: '180px' }">
            <VCard :elevation="0" class="mt-2">
              <VCardText class="px-1 py-1">
                <VList v-model:selected="driveSelected" nav :lines="false" :disabled="IsLoading">
                  <VListItem v-for="item in drives?.children" :key="item.name" :value="item">
                    <template #prepend>
                      <VIcon icon="tabler-devices-pc" />
                    </template>
                    <template #default="{ isActive }">
                      <VListItemTitle>
                        {{ item.name }}
                      </VListItemTitle>
                    </template>
                  </VListItem>
                </VList>
              </VCardText>
            </VCard>
          </VCol>
          <VCol :style="{ alignItems: 'stretch' }">
            <VCard :elevation="0" class="ml-1 mt-2" :style="{ height: '40dvh' }">
              <PerfectScrollbar class="v-card-text px-1 py-1 h-100" :options="{ wheelPropagation: false }">

                <VList v-model:selected="childSelected" nav :lines="false" :disabled="IsLoading">
                  <VListItem v-if="childlist.parent" :value="-(Math.floor(Math.random() * 1000))">
                    <VListItemTitle>
                      . .
                    </VListItemTitle>
                  </VListItem>
                  <VListItem v-if="childlist.children === null" disabled>
                    <VListItemTitle>
                      Not found
                    </VListItemTitle>
                  </VListItem>
                  <VListItem v-else v-for="item in childlist.children" :key="item.name" :value="item">
                    <template #prepend>
                      <VIcon v-if="getIconFile(item.type) != ''" :icon="getIconFile(item.type)" />
                    </template>
                    <template #default="{ isActive }">
                      <VListItemTitle>
                        {{ item.name }}
                      </VListItemTitle>
                    </template>
                  </VListItem>
                </VList>
              </PerfectScrollbar>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>

      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="isDialogVisible = false">
          Cancel
        </VBtn>
        <VBtn :disabled="!ItsValidPath" @click="applyPath">
          Ok
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

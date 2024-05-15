<script setup lang="ts">
import { debounceFilter } from '@vueuse/core';

interface fileIntf {
  name: string
  type: number
}

interface filepathIntf {
  parent: string | null
  children: fileIntf[]
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
const childlist = ref<filepathIntf>({
  parent: null,
  children: []
})
const { ignoreUpdates: ignoreUpdFilePath } = watchIgnorable(
  filePath,
  v => {
    fetchDirs(v)
  },
  { eventFilter: debounceFilter(1000) }
)

const { ignoreUpdates: ignoreUpdSelected } = watchIgnorable(
  childSelected,
  v => {
    const selitem = childSelected.value?.[0]
    if (selitem) {
      ignoreUpdFilePath(() => {
        if ([0, 1, 2].includes(selitem.type))
          filePath.value = (filePath.value ? (filePath.value + `\\`) : '') + selitem.name
        else if (selitem <= 0) {
          let parentpath = filePath.value?.split(/\/|\\/)
          if (parentpath.length == 2 && parentpath[1] === '')
            filePath.value = null
          else {
            const sliceNum = (parentpath?.slice(-1)[0].toLowerCase().includes('.' + fileExt.value) ? 2 : 1)
            filePath.value = parentpath?.slice(0, parentpath?.length - sliceNum).join("\\")
          }
        }
      })
      if (selitem <= 0 || [0, 1].includes(selitem.type))
        fetchDirs(filePath.value)
    } else {
      ignoreUpdFilePath(() => {
        let parentpath = filePath.value?.split(/\/|\\/)
        filePath.value = parentpath?.slice(0, parentpath?.length - 1).join("\\")
      })
    }
  }
)

const fetchDirs = async (_path: string | null) => {
  IsLoading.value = true
  try {
    const resv = await $api('/auth/mydirs', {
      method: 'GET',
      params: {
        flext: fileExt.value,
        root: _path ? btoa(_path) : btoa("/"/*"__drive__"*/)
      },
      onResponseError({ response }) {
      },
    }).finally(() => {
      IsLoading.value = false
    })
    const { parent, children } = resv
    if (Array.isArray(children)) {
      ignoreUpdFilePath(() => {
        if (filePath.value === null && parent != '__drive__' && parent != '__local__') filePath.value = parent
      })
      childlist.value = resv
      if (filePath.value?.toLowerCase().includes('.' + fileExt.value)) {
        const filename = filePath.value?.split(/\/|\\/).slice(-1)[0]
        const idxItem = childlist.value.children.findIndex(v => v.name === filename)
        if (idxItem != -1)
          ignoreUpdSelected(() => {
            childSelected.value = [childlist.value.children[idxItem]]
          })
      }
    } else
      throw "not found"
  } catch (error) {
    childlist.value = {
      parent: null,
      children: []
    }
  }
}

const applyPath = () => {
  isDialogVisible.value = false
  emit('update:path', filePath.value)
}

const loadMyDris = (mode: string, path: string | null) => {
  fileMode.value = mode
  isDialogVisible.value = true
  ignoreUpdFilePath(() => {
    filePath.value = null //path?.length && path!= '__local__' ? path : null
  })
  childlist.value = {
    parent: null,
    children: []
  }
  fetchDirs(path)
}

const ItsValidPath = computed(() => {
  const isvalidFl = childlist.value.parent != null && childlist.value.parent != '__drive__' && filePath.value?.toLowerCase().includes('.' + fileExt.value)
  const filename = filePath.value?.split(/\/|\\/).slice(-1)[0]
  const idxItem = childlist.value.children.findIndex(v => v.name === filename)
  if (fileMode.value === 'save') {
    itsOverwriteNote.value = idxItem != -1
    return isvalidFl
  } else if (fileMode.value === 'open') {
    return isvalidFl && idxItem != -1
  }
  return false
})
const getIconFile = (type: number) => {
  return type === 0 ? 'tabler-devices-pc' : (type === 1 ? 'tabler-folder' : 'tabler-file')
}
defineExpose({
  loadMyDris
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
          the save process will overwrite the existing data": "path not found, please select file path" }}
        </VAlert>
      </VCardText>
      <VCardText>
        <VRow no-gutters>
          <VCol cols="12">
            <VTextField v-model="filePath" label="Select Path" variant="outlined" autofocus />
          </VCol>
          <VCol cols="12">
            <VList nav :lines="false" :disabled="IsLoading" v-model:selected="childSelected">
              <VListItem v-if="childlist.parent === null" disabled>
                <VListItemTitle>
                  Not found
                </VListItemTitle>
              </VListItem>
              <VListItem v-if="childlist.parent && childlist.parent != '/'"
                :value="-(Math.floor(Math.random() * 1000))">
                <VListItemTitle>
                  . .
                </VListItemTitle>
              </VListItem>
              <VListItem v-for="item in childlist.children" :key="item.name" :value="item">
                <template #prepend>
                  <VIcon :icon="getIconFile(item.type)" />
                </template>
                <template #default="{ isActive }">
                  <VListItemTitle>
                    {{ item.name }}
                  </VListItemTitle>
                </template>
              </VListItem>

            </VList>
          </VCol>
        </VRow>
      </VCardText>

      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="isDialogVisible = false">
          Cancel
        </VBtn>
        <VBtn @click="applyPath" :disabled="!ItsValidPath">
          Ok
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

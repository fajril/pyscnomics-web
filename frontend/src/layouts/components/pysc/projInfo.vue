<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'

const appStore = useAppStore()
const curProjectPath = computed(() => appStore.curProjectPath)
const isLoading = ref(false)

interface fileInfo_type {
  path: string | null
  engine: string | null
  pythonHome: string | null
  pythonPath: string | null
  pythonVer: string | null
}

const fileInfo = ref<fileInfo_type>({
  path: null,
  engine: null,
  pythonHome: null,
  pythonPath: null,
  pythonVer: null,
})

const ShowInfo = async () => {
  isLoading.value = true
  fileInfo.value.path = !isEmpty(appStore.curProjectPath) ? appStore.curProjectPath : 'Unsaved file (newfile)'
  fileInfo.value.engine = null
  fileInfo.value.pythonHome = null
  fileInfo.value.pythonPath = null
  fileInfo.value.pythonVer = null
  try {
    const { status, result } = await useHTTP().get({
      path: 'fileinfo',
      params: {
        path: !isEmpty(appStore.curProjectPath) ? btoa(appStore.curProjectPath) : null,
        wspath: appStore.curWS,
      },
      onError: (error: any) => { throw error },
    })

    fileInfo.value.path = result.filepath.replace("\n", '')
    fileInfo.value.engine = result.engine.replace("\n", '')
    fileInfo.value.pythonHome = result.python.home.replace("\n", '')
    fileInfo.value.pythonPath = result.python.path.replace("\n", '')
    fileInfo.value.pythonVer = result.python.version.replace("\n", '')
  }
  catch (error) {
    console.log(error)
  }
  isLoading.value = false
}

const { copy, copied } = useClipboard({ source: computed(() => fileInfo.value.pythonPath) })
</script>

<template>
  <IconBtn
    id="fileinfo-btn"
    class="me-2"
    @click="ShowInfo"
  >
    <VIcon
      icon="tabler-file-info"
      size="26"
    />
    <VMenu
      activator="parent"
      location="bottom end"
      offset="14px"
      :close-on-content-click="false"
    >
      <VCard :loading="isLoading ? 'primary' : false">
        <!-- 👉 Header -->
        <VCardItem class="info-section">
          <VCardTitle class="text-lg">
            {{ `${$t('Project')} ` }}Info
          </VCardTitle>
        </VCardItem>

        <!-- 👉 Notifications list -->
        <VListItem
          v-for="key, index in Object.keys(fileInfo)"
          :key="`${key}_${index}`"
        >
          <template #prepend>
            <div style="inline-size: 80px;">
              <span class="text-xs text-capitalize">{{ key }}</span>
            </div>
          </template>
          <div class="d-flex">
            <IconBtn
              v-if="key === 'pythonPath'"
              class="me-2"
              color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))"
              size="xs"
              @click="() => copy()"
            >
              <VIcon
                icon="tabler-copy"
                size="16"
                :color="copied ? 'success' : 'muted'"
              />
              <VTooltip
                activator="parent"
                scroll-strategy="close"
              >
                <span class="text-capitalize">{{ copied ? 'Copied' : 'Copy to Clipboard' }}</span>
              </VTooltip>
            </IconBtn>
            <span class="text-start text-nowrap text-no-wrap">{{ Object.values(fileInfo)[index] }}</span>
          </div>
        </VListItem>
      </VCard>
    </VMenu>

    <VTooltip
      activator="parent"
      scroll-strategy="close"
    >
      <span>{{ curProjectPath ?? "It's New File project" }}</span>
    </VTooltip>
  </IconBtn>
</template>

<style lang="scss">
.info-section {
  padding: 14px !important;
}

.info-list.v-list {
  .v-list-item {
    border-radius: 0 !important;
    margin: 0 !important;
  }
}
</style>

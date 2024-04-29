<script setup lang="ts">
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-twilight.css';
import Prism from 'vue-prism-component';

import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';

const unknownJson = "TODO: json format blum diketahui"
const appStore = useAppStore()
const PyscConf = usePyscConfStore()

const isDialogVisible = ref(false)
const IsLoading = ref(false)
const jsonCode = ref<Object>({})

const LoadJsonFormat = () => {
  jsonCode.value = {}
  IsLoading.value = true
  isDialogVisible.value = true
  jsonCode.value = Object.assign({}, PyscConf.makeJSON(appStore.curSelCase))
  IsLoading.value = false
}

const { copy, copied } = useClipboard({ source: computed(() => JSON.stringify(jsonCode.value, null, 2)) })

const showlink = ref(false)
const dwnldlink = ref(null)
const dwnld = () => {
  showlink.value = true
  nextTick(() => nextTick(() => {
    if (dwnldlink.value) {
      const blob = new Blob([JSON.stringify(jsonCode.value, null, 2)], {
        type: "application/json",
      })
      const href = URL.createObjectURL(blob)
      dwnldlink.value.href = href
      const namefile = appStore.curProjectPath ? appStore.curProjectPath.split(/\/|\\/).slice(-1)[0] : 'new_contract'
      dwnldlink.value.setAttribute('download', `${namefile.split(/\./).slice(0, 1)}.json`)
      dwnldlink.value.click()
      nextTick(() => showlink.value = false)
    }
  }))
}

defineExpose({
  LoadJsonFormat
})
</script>

<template>
  <VDialog v-model="isDialogVisible" class="v-dialog-xl">
    <DialogCloseBtn @click="isDialogVisible = !isDialogVisible" />
    <VCard title="Json Data" :loading="IsLoading">
      <VCardText>
        <VRow no-gutters>
          <VCol cols="12">
            <div class="d-flex align-center gap-x-3">
              <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))" @click="() => copy()">
                <VIcon icon="tabler-copy" />
                <VTooltip activator="parent" scroll-strategy="close">
                  <span class="text-capitalize">Copy to Clipboard</span>
                </VTooltip>
              </IconBtn>
              <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))" @click="dwnld">
                <VIcon icon="tabler-download" />
                <VTooltip activator="parent" scroll-strategy="close">
                  <span class="text-capitalize">Download</span>
                </VTooltip>
              </IconBtn>
              <a v-if="showlink" href="#" ref="dwnldlink" />
            </div>
          </VCol>
          <VCol cols="12">
            <div class="position-relative">
              <Prism key="json" language="json"
                :style="$vuetify.locale.isRtl ? 'text-align: right' : 'text-align: left'">
                {{ jsonCode }}
              </Prism>
              <IconBtn v-if="copied" class="position-absolute app-card-code-copy-icon">
                <VIcon color="white" icon="tabler-check" size="20" />
                Copied
              </IconBtn>

            </div>
          </VCol>
        </VRow>
      </VCardText>
      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="isDialogVisible = false">
          Close
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.language-json {
  max-block-size: calc(100dvh - 320px);
}

.app-card-code-copy-icon {
  inset-block-start: 1.2em;
  inset-inline-end: 3.5em;
}
</style>

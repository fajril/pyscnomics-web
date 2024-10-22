<script setup lang="ts">
import { VuePDF, usePDF } from '@tato30/vue-pdf'
import '@tato30/vue-pdf/style.css'

// import PdfApp from "vue3-pdf-app"
// import "vue3-pdf-app/dist/icons/main.css"
// import VuePdfEmbed from 'vue-pdf-embed'

// optional styles
// import 'vue-pdf-embed/dist/styles/annotationLayer.css'
// import 'vue-pdf-embed/dist/styles/textLayer.css'

interface Props {
  isDialogVisible: boolean
}
interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const dialogModelValueUpdate = (val: boolean) => {
  emit('update:isDialogVisible', val)
}

// const pdf = ref(undefined)
// const pages = ref(undefined)

// const vuePDFRef = ref(null)
// const textSearch = ref("Teori")

const highlightOptions = ref({
  completeWords: false,
  ignoreCase: true,
})

const pdfSource = ref(undefined)

const pfdConfig = ref({
  sidebar: false,
  toolbar: {
    toolbarViewerRight: false,
  },

})

const { pdf, pages, info } = usePDF({
  url: '/api/auth/getmanualbook',
})

// const openHandler = pdfApp => {
//   isLoading.value = false
// }

// const onLoaded = value => {
//   isLoading.value = false
// }

// const linkPage = ref(1)

// const linkClicked = page => {
//   linkPage.value = page
//   nextTick(() => linkPage.value = undefined)
// }

const zoomScale = ref<number>(1.0)

// const loadPdf = () => {
//   // isLoading.value = true
//   // const { pdf: newPDFToLoad, pages:newPDFpages } = usePDF({
//   //   url:`/api/auth/bookget?book=${bookid}`,
//   //   enableXfa: true
//   // })
//   // watch(newPDFToLoad, () => {
//   //   isLoading.value = false
//   //   nextTick(() => {
//   //     pdf.value = newPDFToLoad.value
//   //     pages.value = newPDFpages.value
//   //   })
//   // })
//   // linkPage.value = undefined
//   pdfSource.value = `/api/auth/getmanualbook`
// }

// nextTick(() => loadPdf())
</script>

<template>
  <VDialog
    :model-value="props.isDialogVisible"
    fullscreen
    :scrim="false"
    scrollable
    content-class="scrollable-dialog"
    transition="dialog-bottom-transition"
    @update:model-value="dialogModelValueUpdate"
  >
    <VCard>
      <div>
        <VToolbar color="primary">
          <VBtn
            icon
            variant="plain"
            @click="() => dialogModelValueUpdate(false)"
          >
            <VIcon
              color="white"
              icon="tabler-x"
            />
          </VBtn>

          <VToolbarTitle
            style="max-inline-size: fit-content;"
            class="me-10"
          >
            <div class="d-flex h-100 align-center">
              <div>PSCnomics Help</div>
            </div>
          </VToolbarTitle>

          <AppSelect
            v-model="zoomScale"
            item-props
            variant="outlined"
            label-placeholder="Zoom"
            placeholder="Zoom"
            :items="[{ title: 'Normal', value: 1.0 }, { title: '1.5X', value: 1.5 }, { title: '2X', value: 2.0 }, { title: '3X', value: 3 }]"
            style="max-inline-size: 150px;"
          />
        </VToolbar>
      </div>
      <VCardText>
        <VuePDF
          v-for="pg in pages"
          :pdf="pdf"
          :page="pg"
          text-layer
          annotation-layer
          class="mb-2"
          :scale="zoomScale"
        />
        <!--
          <PdfApp
          :pdf="pdfSource"
          style="height: 100%;"
          :config="pfdConfig"
          />
        -->
      </VCardText>
    </VCard>
  </VDialog>
</template>

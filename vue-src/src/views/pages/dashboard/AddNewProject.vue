<script setup lang="ts">

import { useAppStore } from "@/stores/appStore";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import type { VForm } from "vuetify/components/VForm";

import * as Pysc from '@/utils/pysc/pyscType';

interface Emit {
  (e: "update:isDrawerOpen", value: boolean): void
  (e: "update:projData", value: Pysc.ProjectBase): void
}

interface Props {
  isDrawerOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const appStore = useAppStore()

const isFormValid = ref(false)
const refForm = ref<VForm>()
const dataEditor = ref<Pysc.ProjectBase>(Pysc.defProj())

const MultiCaseRule = (value: number[]) => {
  if (value.length > 0) return true
  return 'at least 1 case selected.'
}

// 👉 drawer close
const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false)

  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) {
      if (dataEditor.value.type === -1 && dataEditor.value.multicase.length === 0) return
      emit('update:projData', JSON.parse(JSON.stringify(dataEditor.value)))
      emit("update:isDrawerOpen", false)
      nextTick(() => {
        refForm.value?.reset()
        refForm.value?.resetValidation()
      })
    }
  })
}

const handleDrawerModelValueUpdate = (val: boolean) => {
  emit("update:isDrawerOpen", val)
}

const OpenEditor = async (data?: Pysc.ProjectBase) => {
  refForm.value?.reset()
  dataEditor.value = Object.assign({}, data ?? Pysc.defProj())
  emit("update:isDrawerOpen", true)
  nextTick(() => refForm.value?.resetValidation())
}

defineExpose({
  OpenEditor,
})
</script>

<template>
  <VNavigationDrawer temporary :width="500" location="end" class="scrollable-content" :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate">
    <!-- 👉 Title -->
    <AppDrawerHeaderSection :title="`${dataEditor.id ? 'Edit' : 'Add'} Project`" @cancel="closeNavigationDrawer" />

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <!-- 👉 Form -->
          <VForm ref="refForm" v-model="isFormValid" @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="dataEditor.name" persistent-placeholder placeholder="fill name of case"
                  class="mt-4" variant='outlined' :rules="[requiredValidator]">
                  <template #label>
                    Title
                  </template>
                </AppTextField>
                <VSelect v-model="dataEditor.type"
                  :items="[...Pysc.Field2Array(Pysc.ContractType), { title: 'Multiple Project', value: -1 }]" item-props
                  variant="outlined" label="Type of Case" placeholder="select case type" class="mt-4" />
              </VCol>
              <VCol v-if="dataEditor.type === -1" cols="12">
                <VList v-model:selected="dataEditor.multicase" lines="two" density="compact" select-strategy="classic"
                  class="action-item-group-list pt-0" :rules="[requiredValidator, MultiCaseRule(dataEditor.multicase)]">
                  <VListSubheader>List of case</VListSubheader>
                  <VListItem v-for="icase in appStore.projects.filter(row => row.type != -1)" :value="icase.id">
                    <template #prepend="{ isActive }">
                      <VListItemAction start>
                        <VCheckbox :model-value="isActive" color="primary" class="mt-1" />
                      </VListItemAction>
                    </template>
                    <VListItemTitle>{{ icase.name }}</VListItemTitle>
                    <VListItemSubtitle>{{ Object.values(Pysc.ContractType)[icase.type] }}</VListItemSubtitle>
                  </VListItem>
                  <div v-if="dataEditor.multicase.length === 0" class="v-input__details">
                    <div class="v-messages" role="alert" aria-live="polite">
                      <div class="v-messages__message text-error">at least 1 case selected.</div>
                    </div><!---->
                  </div>
                </VList>

              </VCol>
              <VCol cols="12" class="pt-0">
                <VTextarea v-model="dataEditor.description" clearable clear-icon="tabler-circle-x" label="Description"
                  rows="4" class="mt-4" persistent-placeholder variant="outlined" placeholder="project description" />
              </VCol>
              <!-- 👉 Submit and Cancel -->
              <VCol cols="12">
                <VBtn type="submit" class="me-3"> Submit </VBtn>
                <VBtn type="reset" variant="outlined" color="secondary" @click="closeNavigationDrawer">
                  Cancel
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>

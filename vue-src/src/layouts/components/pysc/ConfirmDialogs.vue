<script setup lang="ts">
interface Props {
  isShow: boolean
  msg: string
  title?: string
  btnNo?: string
  btnYes?: string
}
interface Emit {
  (e: 'update:isShow', value: boolean): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirmation',
  btnNo: 'No',
  btnYes: 'Yes'
})

const emit = defineEmits<Emit>()

const ConfirmClick = () => {
  emit('confirm')
  emit('update:isShow', false)
}
</script>

<template>
  <VDialog :model-value="$props.isShow" @update:model-value="$emit('update:isShow', false)" persistent
    class="v-dialog-sm">
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="$emit('update:isShow', false)" />

    <!-- Dialog Content -->
    <VCard title="Confirmation">
      <VCardText>
        {{ $props.msg }}
      </VCardText>

      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="$emit('update:isShow', false)">
          {{ $props.btnNo }}
        </VBtn>
        <VBtn @click="ConfirmClick">
          {{ $props.btnYes }}
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<script lang="ts" setup>
interface Props {
  menuList?: unknown[]
  itemProps?: boolean
}
interface Emit {
  (e: 'click:item', value: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()
</script>

<template>
  <IconBtn color="disabled">
    <VIcon icon="tabler-dots-vertical" />

    <VMenu
      v-if="props.menuList"
      activator="parent"
    >
      <VList
        :items="props.menuList"
        :item-props="props.itemProps"
      >
        <template #item="{ props: propItem }">
          <VListItem
            :title="propItem.title"
            :value="propItem.value"
            @click="() => propItem.onClick ? propItem.onClick(propItem.value) : emit('click:item', propItem.value)"
          />
        </template>
      </VList>
    </VMenu>
  </IconBtn>
</template>

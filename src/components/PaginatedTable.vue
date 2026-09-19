<script setup lang="ts" generic="T extends Record<string, unknown>">
defineProps<{
  data: T[]
  total: number
  page: number
  limit: number
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:page', v: number): void
  (e: 'update:limit', v: number): void
}>()
</script>

<template>
  <div>
    <el-table v-loading="loading ?? false" :data="data" v-bind="$attrs">
      <slot />
    </el-table>
    <el-pagination
      :current-page="page"
      :page-size="limit"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top: 12px; justify-content: flex-end; display: flex"
      @current-change="(p: number) => emit('update:page', p)"
      @size-change="(s: number) => emit('update:limit', s)"
    />
  </div>
</template>

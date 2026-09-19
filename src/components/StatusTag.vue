<script setup lang="ts">
defineProps<{ status: string }>()

function tagType(status: string): '' | 'success' | 'danger' | 'info' | 'warning' {
  if (status === 'alive' || status === 'active' || status === '成功') return 'success'
  if (status === 'dead' || status === '失败') return 'danger'
  return 'info'
}
</script>

<template>
  <el-tag :type="tagType(status)" size="small">{{ status }}</el-tag>
</template>

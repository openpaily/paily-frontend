<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import NodeDetailDrawer from './NodeDetailDrawer.vue'
import SourceDetailDrawer from './SourceDetailDrawer.vue'

const type = ref<'node' | 'source'>('node')
const uuid = ref('')

const nodeDrawerVisible = ref(false)
const sourceDrawerVisible = ref(false)
const activeNodeId = ref<string | null>(null)
const activeSourceId = ref<string | null>(null)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function open() {
  const id = uuid.value.trim()
  if (!UUID_RE.test(id)) {
    ElMessage.warning('请输入有效的 UUID')
    return
  }
  if (type.value === 'node') {
    activeNodeId.value = id
    nodeDrawerVisible.value = true
  } else {
    activeSourceId.value = id
    sourceDrawerVisible.value = true
  }
  uuid.value = ''
}

function openSourceFromNode(id: string) {
  activeSourceId.value = id
  sourceDrawerVisible.value = true
}

function openNodeFromSource(id: string) {
  activeNodeId.value = id
  nodeDrawerVisible.value = true
}
</script>

<template>
  <div style="display: flex; align-items: center; gap: 6px">
    <el-select v-model="type" style="width: 80px" size="small">
      <el-option label="节点" value="node" />
      <el-option label="来源" value="source" />
    </el-select>
    <el-input
      v-model="uuid"
      placeholder="输入 UUID 快速打开详情…"
      size="small"
      style="width: 260px"
      clearable
      @keyup.enter="open"
    />
    <el-button size="small" type="primary" @click="open">打开</el-button>
  </div>

  <NodeDetailDrawer
    v-if="activeNodeId"
    v-model="nodeDrawerVisible"
    :node-id="activeNodeId"
    @open-source="openSourceFromNode"
  />
  <SourceDetailDrawer
    v-if="activeSourceId"
    v-model="sourceDrawerVisible"
    :source-id="activeSourceId"
    @open-node="openNodeFromSource"
  />
</template>

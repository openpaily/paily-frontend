<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getFetchLogs } from '../api/logs'
import { getSource, getSourceNodes, updateSource, deleteSource, ignoreDeadSource } from '../api/sources'
import StatusTag from './StatusTag.vue'
import type { FetchLogEntry, NodeSummary, SourceDetail, SourceUpdateRequest } from '../types/api'

const props = defineProps<{ sourceId: string; modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'open-node', id: string): void
  (e: 'deleted', id: string): void
}>()

const activeTab = ref('info')

// basic info
const detail = ref<SourceDetail | null>(null)
const loadingDetail = ref(false)

// fetch logs
const fetchLogs = ref<FetchLogEntry[]>([])
const loadingLogs = ref(false)

// source nodes
const sourceNodes = ref<NodeSummary[]>([])
const nodesTotal = ref(0)
const loadingNodes = ref(false)

// edit dialog
const editDialogVisible = ref(false)
const editLoading = ref(false)
const editForm = ref({ identifier: '', info: '', content: '' })

async function loadDetail() {
  loadingDetail.value = true
  try {
    const res = await getSource(props.sourceId)
    detail.value = res.data
  } finally {
    loadingDetail.value = false
  }
}

async function loadFetchLogs() {
  loadingLogs.value = true
  try {
    const res = await getFetchLogs({ source_id: props.sourceId, limit: 20 })
    fetchLogs.value = res.data.data
  } finally {
    loadingLogs.value = false
  }
}

async function loadSourceNodes() {
  loadingNodes.value = true
  try {
    const res = await getSourceNodes(props.sourceId, { limit: 50 })
    sourceNodes.value = res.data.data
    nodesTotal.value = res.data.pagination.total
  } finally {
    loadingNodes.value = false
  }
}

watch(
  () => [props.modelValue, props.sourceId] as const,
  ([open]) => {
    if (open) {
      activeTab.value = 'info'
      detail.value = null
      fetchLogs.value = []
      sourceNodes.value = []
      nodesTotal.value = 0
      loadDetail()
    }
  },
  { immediate: true },
)

function onTabChange(tab: string) {
  if (tab === 'logs' && fetchLogs.value.length === 0) loadFetchLogs()
  if (tab === 'nodes' && sourceNodes.value.length === 0) loadSourceNodes()
}

// ── edit ──────────────────────────────────────────────────────────────
function openEdit() {
  editForm.value = {
    identifier: detail.value?.identifier ?? '',
    info: detail.value?.info ?? '',
    content: detail.value?.content ?? '',
  }
  editDialogVisible.value = true
}

async function submitEdit() {
  editLoading.value = true
  try {
    const payload: SourceUpdateRequest = {
      identifier: editForm.value.identifier,
      info: editForm.value.info,
    }
    if (detail.value?.type === 'subscribe') payload.content = editForm.value.content
    await updateSource(props.sourceId, payload)
    ElMessage.success('已保存')
    editDialogVisible.value = false
    await loadDetail()
  } catch { /* handled globally */ } finally {
    editLoading.value = false
  }
}

// ── delete ─────────────────────────────────────────────────────────────
async function handleDelete() {
  await ElMessageBox.confirm('确定删除该来源？此操作不可恢复。', '删除确认', { type: 'warning' })
  await deleteSource(props.sourceId)
  ElMessage.success('已删除')
  emit('update:modelValue', false)
  emit('deleted', props.sourceId)
}

// ── ignore dead toggle ────────────────────────────────────────────────
async function handleIgnoreDead(val: boolean) {
  if (!detail.value) return
  await ignoreDeadSource(props.sourceId, val)
  detail.value.ignore_dead = val
}

function close() { emit('update:modelValue', false) }
</script>

<template>
  <el-drawer :model-value="modelValue" title="来源详情" size="640px" @close="close">
    <!-- header actions -->
    <template #header="{ titleId, titleClass }">
      <span :id="titleId" :class="titleClass">来源详情</span>
      <div style="display: flex; gap: 8px; margin-left: auto">
        <el-button size="small" @click="openEdit">编辑</el-button>
        <el-button size="small" type="danger" plain @click="handleDelete">删除</el-button>
      </div>
    </template>

    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="info">
        <div v-loading="loadingDetail" style="min-height: 160px">
          <el-descriptions v-if="detail" :column="2" border size="small">
            <el-descriptions-item label="ID" :span="2">
              <span style="font-family: monospace; font-size: 12px">{{ detail.id }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="类型">{{ detail.type }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <StatusTag :status="detail.status" />
            </el-descriptions-item>
            <el-descriptions-item label="标识符">{{ detail.identifier || '—' }}</el-descriptions-item>
            <el-descriptions-item label="描述">{{ detail.info || '—' }}</el-descriptions-item>
            <el-descriptions-item label="忽略死亡">
              <el-switch :model-value="detail.ignore_dead ?? false" @change="(val: boolean) => handleIgnoreDead(val)" />
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ detail.updated_at }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.content" label="内容" :span="2">
              <div v-if="detail.type === 'node'"
                style="font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; background: #f5f5f5; padding: 8px; border-radius: 4px; max-height: 200px; overflow: auto">
                {{ detail.content }}</div>
              <span v-else style="font-size: 12px; word-break: break-all">{{ detail.content }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-tab-pane>

      <!-- 抓取日志 -->
      <el-tab-pane label="抓取日志" name="logs">
        <el-table v-loading="loadingLogs" :data="fetchLogs" size="small">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column label="结果" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="node_count" label="节点数" width="80" />
          <el-table-column prop="fetched_at" label="抓取时间" />
        </el-table>
      </el-tab-pane>

      <!-- 来源节点 -->
      <el-tab-pane label="节点列表" name="nodes">
        <div style="font-size: 12px; color: #909399; margin-bottom: 8px">
          共 {{ nodesTotal }} 个节点（最多展示 50 条）
        </div>
        <el-table v-loading="loadingNodes" :data="sourceNodes" size="small">
          <el-table-column prop="protocol" label="协议" width="80" />
          <el-table-column prop="server" label="服务器" min-width="150" show-overflow-tooltip />
          <el-table-column prop="region" label="区域" width="65" />
          <el-table-column label="存活" width="70">
            <template #default="{ row }">
              <StatusTag :status="row.alive ? 'alive' : 'dead'" />
            </template>
          </el-table-column>
          <el-table-column label="分数" width="100">
            <template #default="{ row }">
              <el-progress :percentage="Math.round(row.score * 100)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="emit('open-node', row.id)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑来源" width="500px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="标识符">
          <el-input v-model="editForm.identifier" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.info" />
        </el-form-item>
        <template v-if="detail?.type === 'subscribe'">
          <el-form-item label="内容">
            <el-input v-model="editForm.content" type="textarea" :rows="6" placeholder="每行一个订阅条目，支持下方四种格式…"
              style="font-family: monospace; font-size: 12px" />
          </el-form-item>
          <el-form-item>
            <div style="font-size: 12px; color: #909399; line-height: 1.8; text-align: left">
              <div style="margin-bottom: 2px">内容每行一个条目，支持四种格式：</div>
              <div>· <b>纯链接</b>：直接填写 https://… 订阅链接或节点 URI</div>
              <div>· <b>expr:</b> 开头，后跟 expr-lang 表达式，可用 date.year、date.month、date.day</div>
              <div style="padding-left: 12px; color: #b0b0b0">例: expr: &quot;https://example.com/sub?d=&quot; +
                date.year + date.month + date.day + &quot;.yaml&quot;</div>
              <div>· <b>exprdate:</b> 开头，用 {y}、{m}、{d} 作日期占位符，更简洁</div>
              <div style="padding-left: 12px; color: #b0b0b0">例: exprdate: https://example.com/sub/{y}{m}{d}.yaml</div>
              <div>· <b>extract:</b> 开头，拉取对应链接的内容，自动提取其中所有 http/https 链接或节点 URI</div>
              <div style="padding-left: 12px; color: #b0b0b0">例: extract: https://example.com/list.txt</div>
            </div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">保 存</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

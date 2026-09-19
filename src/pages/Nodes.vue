<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatusTag from '../components/StatusTag.vue'
import ExprEditor from '../components/ExprEditor.vue'
import NodeDetailDrawer from '../components/NodeDetailDrawer.vue'
import SourceDetailDrawer from '../components/SourceDetailDrawer.vue'
import { getNodes, searchNodes, deleteNode } from '../api/nodes'
import { getCheckers } from '../api/checkers'
import type { NodeSummary, NodeListResponse } from '../types/api'
import { formatLatency } from '../utils/format'

// ── state ──────────────────────────────────────────────────────────────

const tableData = ref<NodeSummary[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  alive: '' as '' | 'true' | 'false',
  region: '',
  protocol: '',
  server: '',
  source_id: '',
  min_score: null as number | null,
  max_score: null as number | null,
  has_streaming: '',
  tag: '',
  sort_by: '' as '' | 'region' | 'score',
  sort_dir: 'desc' as 'asc' | 'desc',
})

const checkerTags = ref<string[]>([])

const advancedMode = ref(false)
const exprValue = ref('')

// ── detail drawer ──────────────────────────────────────────────────────
const drawerVisible = ref(false)
const selectedNodeId = ref<string | null>(null)
// ── source drawer ───────────────────────────────────────────────────
const sourceDrawerVisible = ref(false)
const selectedSourceId = ref<string | null>(null)

function openSourceDrawer(id: string) {
  selectedSourceId.value = id
  sourceDrawerVisible.value = true
}
// ── fetch ──────────────────────────────────────────────────────────────
async function fetchNodes() {
  loading.value = true
  try {
    let res: { data: NodeListResponse }
    if (advancedMode.value && exprValue.value.trim()) {
      res = await searchNodes({ expr: exprValue.value.trim(), page: page.value, limit: pageSize.value })
    } else {
      const params: Record<string, unknown> = { page: page.value, limit: pageSize.value }
      if (filters.alive !== '') params.alive = filters.alive
      if (filters.region) params.region = filters.region
      if (filters.protocol) params.protocol = filters.protocol
      if (filters.server) params.server = filters.server
      if (filters.source_id) params.source_id = filters.source_id
      if (filters.min_score !== null) params.min_score = filters.min_score
      if (filters.max_score !== null) params.max_score = filters.max_score
      if (filters.has_streaming) params.has_streaming = filters.has_streaming
      if (filters.tag) params.tag = filters.tag
      if (filters.sort_by) params.sort_by = filters.sort_by
      if (filters.sort_dir) params.sort_dir = filters.sort_dir
      res = await getNodes(params)
    }
    tableData.value = res.data.data
    total.value = res.data.pagination.total
  } catch {
    // handled globally
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  page.value = 1
  fetchNodes()
}

function resetFilters() {
  Object.assign(filters, { alive: '', region: '', protocol: '', server: '', source_id: '', min_score: null, max_score: null, has_streaming: '', tag: '', sort_by: '', sort_dir: 'desc' })
  exprValue.value = ''
  page.value = 1
  fetchNodes()
}

function handlePageChange(p: number) {
  page.value = p
  fetchNodes()
}

function handleSizeChange(s: number) {
  pageSize.value = s
  page.value = 1
  fetchNodes()
}

// ── delete ─────────────────────────────────────────────────────────────
async function handleDelete(node: NodeSummary) {
  await ElMessageBox.confirm(`确定删除节点 ${node.server}？`, '删除确认', { type: 'warning' })
  await deleteNode(node.id)
  ElMessage.success('已删除')
  fetchNodes()
}
async function copyId(id: string) {
  await navigator.clipboard.writeText(id)
  ElMessage.success('已复制 ID')
}
// ── detail ─────────────────────────────────────────────────────────────
function openDetail(node: NodeSummary) {
  selectedNodeId.value = node.id
  drawerVisible.value = true
}

onMounted(async () => {
  fetchNodes()
  try {
    const res = await getCheckers()
    checkerTags.value = res.data.checkers
  } catch { /* non-critical */ }
})
</script>

<template>
  <div>
    <h2 style="margin: 0 0 16px">节点管理</h2>

    <!-- 过滤器 -->
    <el-card shadow="never" style="margin-bottom: 16px">
      <el-form inline @submit.prevent="handleFilter">
        <el-form-item label="存活">
          <el-select v-model="filters.alive" placeholder="全部" clearable style="width: 90px">
            <el-option label="是" value="true" />
            <el-option label="否" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="filters.region" placeholder="HK/US…" clearable style="width: 90px" />
        </el-form-item>
        <el-form-item label="协议">
          <el-input v-model="filters.protocol" placeholder="vmess…" clearable style="width: 100px" />
        </el-form-item>
        <el-form-item label="服务器">
          <el-input v-model="filters.server" placeholder="domain/ip" clearable style="width: 130px" />
        </el-form-item>
        <el-form-item label="来源ID">
          <el-input v-model="filters.source_id" placeholder="uuid" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="分数">
          <el-input-number v-model="filters.min_score" :min="0" :max="1" :step="0.1" :precision="2" placeholder="最低"
            controls-position="right" style="width: 90px" />
          <span style="margin: 0 4px">~</span>
          <el-input-number v-model="filters.max_score" :min="0" :max="1" :step="0.1" :precision="2" placeholder="最高"
            controls-position="right" style="width: 90px" />
        </el-form-item>
        <el-form-item label="流媒体">
          <el-input v-model="filters.has_streaming" placeholder="netflix,youtube" clearable style="width: 130px" />
        </el-form-item>
        <el-form-item label="Checker">
          <el-select v-model="filters.tag" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="t in checkerTags" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-select v-model="filters.sort_by" placeholder="默认" clearable style="width: 90px">
            <el-option label="区域" value="region" />
            <el-option label="分数" value="score" />
          </el-select>
          <el-select v-model="filters.sort_dir" style="width: 80px; margin-left: 4px">
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <el-button link @click="advancedMode = !advancedMode">
            {{ advancedMode ? '隐藏高级搜索' : '高级搜索 (expr)' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="advancedMode" style="margin-top: 8px">
        <ExprEditor v-model="exprValue" placeholder="输入 expr-lang 表达式进行高级过滤…" />
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" style="width: 100%" row-key="id">
        <!-- ID 列 -->
        <el-table-column label="ID" width="110">
          <template #default="{ row }">
            <el-tooltip :content="row.id" placement="top">
              <el-button link type="primary" size="small" style="font-family: monospace; font-size: 11px"
                @click="copyId(row.id)">
                {{ row.id.slice(0, 8) }}…
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="protocol" label="协议" width="90" />
        <el-table-column prop="server" label="服务器" width="250" show-overflow-tooltip />
        <!-- 来源列 -->
        <el-table-column label="来源" min-width="130">
          <template #default="{ row }">
            <template v-if="row.sources && row.sources.length">
              <el-tag v-for="src in row.sources" :key="src.id" size="small" style="margin: 2px; cursor: pointer"
                @click="openSourceDrawer(src.id)">{{ src.info || src.identifier || src.id.slice(0, 8) }}</el-tag>
            </template>
            <span v-else style="color: #c0c4cc; font-size: 12px">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="region" label="区域" width="70" />
        <!-- 延迟列 -->
        <el-table-column label="延迟" width="140">
          <template #default="{ row }">
            <div style="line-height: 1.6; font-size: 12px">
              <div v-if="row.latest_latency_ms != null">
                <span style="color: #909399">初筛：</span>
                <span>{{ formatLatency(row.latest_latency_ms) }}</span>
              </div>
              <div v-if="row.latest_avg_latency_ms != null">
                <span style="color: #909399">平均：</span>
                <span>{{ formatLatency(row.latest_avg_latency_ms) }}</span>
                <span v-if="row.latest_jitter_ms != null" style="color: #b0b0b0"> ±{{ row.latest_jitter_ms }}ms</span>
              </div>
              <span v-if="row.latest_latency_ms == null && row.latest_avg_latency_ms == null"
                style="color: #c0c4cc">—</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分数" width="170">
          <template #default="{ row }">
            <div style="display: flex; align-items: center">
              <el-progress :percentage="Math.round(row.score * 100)"
                :status="row.score >= 0.6 ? 'success' : row.score >= 0.3 ? 'warning' : 'exception'" :stroke-width="10"
                style="flex: 1" />
              <span style="font-size: 11px; color: #606266; white-space: nowrap">{{ row.score.toFixed(3) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="存活" width="80">
          <template #default="{ row }">
            <StatusTag :status="row.alive ? 'alive' : 'dead'" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next" style="margin-top: 12px; justify-content: flex-end; display: flex"
        @current-change="handlePageChange" @size-change="handleSizeChange" />
    </el-card>

    <!-- 节点详情抽屉 -->
    <NodeDetailDrawer v-if="selectedNodeId" v-model="drawerVisible" :node-id="selectedNodeId"
      @open-source="openSourceDrawer" />
    <!-- 来源详情抽屉 -->
    <SourceDetailDrawer v-if="selectedSourceId" v-model="sourceDrawerVisible" :source-id="selectedSourceId"
      @open-node="(id) => { selectedNodeId = id; drawerVisible = true }" />
  </div>
</template>

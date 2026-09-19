<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatusTag from '../components/StatusTag.vue'
import ExprEditor from '../components/ExprEditor.vue'
import SourceDetailDrawer from '../components/SourceDetailDrawer.vue'
import NodeDetailDrawer from '../components/NodeDetailDrawer.vue'
import { getSources, createSource, updateSource, deleteSource, searchSources, ignoreDeadSource } from '../api/sources'
import type { SourceSummary, SourceType, SourceStatus } from '../types/api'

// ── list state ──────────────────────────────────────────────────────────
const tableData = ref<SourceSummary[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  type: '' as '' | SourceType,
  status: '' as '' | SourceStatus,
  identifier: '',
  info: '',
  sort_by: '' as '' | 'node_count',
  sort_dir: 'desc' as 'asc' | 'desc',
})

const advancedMode = ref(false)
const exprValue = ref('')

// ── detail drawer ───────────────────────────────────────────────────────
// ── source drawer ───────────────────────────────────────────────
// (kept as drawerVisible / selectedSourceId for back-compat)
const drawerVisible = ref(false)
const selectedSourceId = ref<string | null>(null)

// ── node drawer ───────────────────────────────────────────────────
const nodeDrawerVisible = ref(false)
const selectedNodeId = ref<string | null>(null)

function openNodeDrawer(id: string) {
  selectedNodeId.value = id
  nodeDrawerVisible.value = true
}

// ── create dialog ───────────────────────────────────────────────────────
const createDialogVisible = ref(false)
const createLoading = ref(false)
const createForm = reactive({
  type: 'subscribe' as SourceType,
  content: '',
  identifier: '',
  info: '',
})
// node-type structured payload fields
const nodeForm = reactive({
  formatType: 'mixed' as 'mixed' | 'clash' | 'singbox',
  nodeContent: '',
})

// ── edit dialog ─────────────────────────────────────────────────────────
const editDialogVisible = ref(false)
const editLoading = ref(false)
const editingId = ref('')
const editForm = reactive({ identifier: '', info: '', content: '', type: '' as SourceType | '' })

// ── fetch ───────────────────────────────────────────────────────────────
async function fetchSources() {
  loading.value = true
  try {
    if (advancedMode.value && exprValue.value.trim()) {
      const res = await searchSources({ expr: exprValue.value.trim(), page: page.value, limit: pageSize.value })
      tableData.value = res.data.data
      total.value = res.data.pagination.total
    } else {
      const params: Record<string, unknown> = { page: page.value, limit: pageSize.value }
      if (filters.type) params.type = filters.type
      if (filters.status) params.status = filters.status
      if (filters.identifier) params.identifier = filters.identifier
      if (filters.info) params.info = filters.info
      if (filters.sort_by) params.sort_by = filters.sort_by
      if (filters.sort_dir) params.sort_dir = filters.sort_dir
      const res = await getSources(params)
      tableData.value = res.data.data
      total.value = res.data.pagination.total
    }
  } catch { /* handled globally */ } finally {
    loading.value = false
  }
}

function handleFilter() { page.value = 1; fetchSources() }

function resetFilters() {
  Object.assign(filters, { type: '', status: '', identifier: '', info: '', sort_by: '', sort_dir: 'desc' })
  exprValue.value = ''
  page.value = 1
  fetchSources()
}

function handlePageChange(p: number) { page.value = p; fetchSources() }
function handleSizeChange(s: number) { pageSize.value = s; page.value = 1; fetchSources() }

// ── ignore dead toggle ───────────────────────────────────────────────────
async function handleIgnoreDead(row: SourceSummary, val: boolean) {
  try {
    await ignoreDeadSource(row.id, val)
    row.ignore_dead = val
  } catch {
    row.ignore_dead = !val // revert on error
  }
}

// ── delete ───────────────────────────────────────────────────────────────
async function handleDelete(row: SourceSummary) {
  await ElMessageBox.confirm(`确定删除来源 "${row.identifier || row.id}"？`, '删除确认', { type: 'warning' })
  await deleteSource(row.id)
  ElMessage.success('已删除')
  fetchSources()
}

async function copyId(id: string) {
  await navigator.clipboard.writeText(id)
  ElMessage.success('已复制 ID')
}

function formatContent(content: string | undefined): string {
  if (!content) return '—'
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length <= 1) return lines[0] || '—'
  return lines[0] + ` 等${lines.length - 1}行`
}

// ── detail drawer ─────────────────────────────────────────────────────────
function openDetail(row: SourceSummary) {
  selectedSourceId.value = row.id
  drawerVisible.value = true
}

// ── create ────────────────────────────────────────────────────────────────
function openCreate() {
  Object.assign(createForm, { type: 'subscribe', content: '', identifier: '', info: '' })
  Object.assign(nodeForm, { formatType: 'mixed', nodeContent: '' })
  createDialogVisible.value = true
}

async function submitCreate() {
  let content: string
  if (createForm.type === 'node') {
    if (!nodeForm.nodeContent.trim()) { ElMessage.warning('节点内容不能为空'); return }
    content = JSON.stringify({ type: nodeForm.formatType, content: nodeForm.nodeContent })
  } else {
    if (!createForm.content.trim()) { ElMessage.warning('内容不能为空'); return }
    content = createForm.content
  }
  createLoading.value = true
  try {
    await createSource({
      type: createForm.type,
      content,
      ...(createForm.identifier ? { identifier: createForm.identifier } : {}),
      ...(createForm.info ? { info: createForm.info } : {}),
    })
    ElMessage.success('来源已创建')
    createDialogVisible.value = false
    fetchSources()
  } catch { /* handled globally */ } finally {
    createLoading.value = false
  }
}

// ── edit ──────────────────────────────────────────────────────────────────
function openEdit(row: SourceSummary) {
  editingId.value = row.id
  editForm.identifier = row.identifier
  editForm.info = row.info
  editForm.type = row.type
  editForm.content = row.content || ''
  editDialogVisible.value = true
}

async function submitEdit() {
  editLoading.value = true
  try {
    const payload: { identifier?: string; info?: string; content?: string } = {
      identifier: editForm.identifier,
      info: editForm.info,
    }
    if (editForm.type === 'subscribe') payload.content = editForm.content
    await updateSource(editingId.value, payload)
    ElMessage.success('已保存')
    editDialogVisible.value = false
    fetchSources()
  } catch { /* handled globally */ } finally {
    editLoading.value = false
  }
}

onMounted(fetchSources)
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px">
      <h2 style="margin: 0">来源管理</h2>
      <el-button type="primary" @click="openCreate">+ 新建来源</el-button>
    </div>

    <!-- 过滤器 -->
    <el-card shadow="never" style="margin-bottom: 16px">
      <el-form inline @submit.prevent="handleFilter">
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部" clearable style="width: 110px">
            <el-option label="订阅" value="subscribe" />
            <el-option label="节点" value="node" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 100px">
            <el-option label="活跃" value="active" />
            <el-option label="死亡" value="dead" />
          </el-select>
        </el-form-item>
        <el-form-item label="标识符">
          <el-input v-model="filters.identifier" clearable style="width: 130px" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="filters.info" clearable style="width: 130px" />
        </el-form-item>
        <el-form-item label="排序">
          <el-select v-model="filters.sort_by" placeholder="默认" clearable style="width: 110px">
            <el-option label="节点数" value="node_count" />
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
        <ExprEditor v-model="exprValue" placeholder="输入 expr-lang 表达式进行高级过滤…" target="source" />
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" style="width: 100%" row-key="id">
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
        <el-table-column label="类型" width="75">
          <template #default="{ row }">
            {{ row.type === 'subscribe' ? '订阅' : '节点' }}
          </template>
        </el-table-column>
        <!-- 内容列：subscribe 显示截断内容，node 显示标签 -->
        <el-table-column label="内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="row.type === 'node'">
              <el-tag size="small" type="info">节点来源</el-tag>
            </template>
            <span v-else style="font-size: 12px; color: #606266">{{ formatContent(row.content) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="最新节点数" width="100">
          <template #default="{ row }">
            <span v-if="row.type === 'subscribe' && row.latest_fetch_node_count != null">{{ row.latest_fetch_node_count
              }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="忽略死亡" width="100">
          <template #default="{ row }">
            <el-switch :model-value="row.ignore_dead ?? false" @change="(val: boolean) => handleIgnoreDead(row, val)" />
          </template>
        </el-table-column>
        <el-table-column prop="identifier" label="标识符" width="200" show-overflow-tooltip />
        <el-table-column prop="info" label="描述" width="270" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next" style="margin-top: 12px; justify-content: flex-end; display: flex"
        @current-change="handlePageChange" @size-change="handleSizeChange" />
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建来源" width="540px">
      <el-form label-width="90px">
        <el-form-item label="类型" required>
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="订阅 (subscribe)" value="subscribe" />
            <el-option label="节点 (node)" value="node" />
          </el-select>
        </el-form-item>

        <!-- subscribe: raw content -->
        <template v-if="createForm.type === 'subscribe'">
          <el-form-item label="内容" required>
            <el-input v-model="createForm.content" type="textarea" :rows="6" placeholder="每行一个订阅条目，支持下方四种格式…"
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

        <!-- node: structured payload -->
        <template v-else>
          <el-form-item label="格式" required>
            <el-select v-model="nodeForm.formatType" style="width: 100%">
              <el-option label="mixed（混合格式）" value="mixed" />
              <el-option label="clash（Clash YAML）" value="clash" />
              <el-option label="singbox（Sing-box JSON）" value="singbox" />
            </el-select>
          </el-form-item>
          <el-form-item label="节点内容" required>
            <el-input v-model="nodeForm.nodeContent" type="textarea" :rows="6" placeholder="粘贴节点配置内容…"
              style="font-family: monospace; font-size: 12px" />
          </el-form-item>
          <el-form-item>
            <span style="font-size: 12px; color: #909399">
              将提交为
              <code>{{ JSON.stringify({ type: nodeForm.formatType, content: '…' }) }}</code>
            </span>
          </el-form-item>
        </template>

        <el-form-item label="标识符">
          <el-input v-model="createForm.identifier" placeholder="可选，便于识别" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.info" placeholder="可选，说明文字" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑来源" width="500px">
      <el-form label-width="80px">
        <el-form-item label="标识符">
          <el-input v-model="editForm.identifier" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.info" />
        </el-form-item>
        <template v-if="editForm.type === 'subscribe'">
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
        <el-button type="primary" :loading="editLoading" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 来源详情抽屉 -->
    <SourceDetailDrawer v-if="selectedSourceId" v-model="drawerVisible" :source-id="selectedSourceId"
      @open-node="openNodeDrawer" />
    <!-- 节点详情抽屉 -->
    <NodeDetailDrawer v-if="selectedNodeId" v-model="nodeDrawerVisible" :node-id="selectedNodeId"
      @open-source="(id) => { selectedSourceId = id; drawerVisible = true }" />
  </div>
</template>

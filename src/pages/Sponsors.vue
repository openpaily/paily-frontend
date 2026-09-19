<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExprEditor from '../components/ExprEditor.vue'
import StatusTag from '../components/StatusTag.vue'
import { getSponsors, createSponsor, updateSponsor, deleteSponsor } from '../api/sponsors'
import { previewFilter } from '../api/filter'
import type { SponsorSummary, NodeSummary } from '../types/api'

// ── list ─────────────────────────────────────────────────────────────────
const tableData = ref<SponsorSummary[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// ── form shared ───────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEditing = ref(false)
const editingId = ref('')
const formLoading = ref(false)
const form = reactive({
  name: '',
  text: '',
  filter_expr: '',
  priority: 0,
})

// ── preview ───────────────────────────────────────────────────────────────
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewNodes = ref<NodeSummary[]>([])

// ── fetch ────────────────────────────────────────────────────────────────
async function fetchSponsors() {
  loading.value = true
  try {
    const res = await getSponsors({ page: page.value, limit: pageSize.value })
    tableData.value = res.data.data
    total.value = res.data.pagination.total
  } catch { /* handled globally */ } finally {
    loading.value = false
  }
}

function handlePageChange(p: number) { page.value = p; fetchSponsors() }
function handleSizeChange(s: number) { pageSize.value = s; page.value = 1; fetchSponsors() }

// ── delete ────────────────────────────────────────────────────────────────
async function handleDelete(row: SponsorSummary) {
  await ElMessageBox.confirm(`确定删除赞助商 "${row.name}"？`, '删除确认', { type: 'warning' })
  await deleteSponsor(row.id)
  ElMessage.success('已删除')
  fetchSponsors()
}

// ── create / edit dialog ──────────────────────────────────────────────────
function openCreate() {
  isEditing.value = false
  dialogTitle.value = '新建赞助商'
  Object.assign(form, { name: '', text: '', filter_expr: '', priority: 0 })
  dialogVisible.value = true
}

function openEdit(row: SponsorSummary) {
  isEditing.value = true
  editingId.value = row.id
  dialogTitle.value = '编辑赞助商'
  Object.assign(form, { name: row.name, text: row.text, filter_expr: row.filter_expr, priority: row.priority })
  dialogVisible.value = true
}

async function submitForm() {
  if (!form.name.trim()) { ElMessage.warning('名称不能为空'); return }
  formLoading.value = true
  try {
    if (isEditing.value) {
      await updateSponsor(editingId.value, { name: form.name, text: form.text, filter_expr: form.filter_expr, priority: form.priority })
      ElMessage.success('已保存')
    } else {
      await createSponsor({ name: form.name, text: form.text, filter_expr: form.filter_expr, priority: form.priority })
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    fetchSponsors()
  } catch { /* handled globally */ } finally {
    formLoading.value = false
  }
}

// ── preview matching nodes ────────────────────────────────────────────────
async function handlePreview() {
  if (!form.filter_expr.trim()) { ElMessage.warning('请先填写过滤表达式'); return }
  previewLoading.value = true
  previewVisible.value = true
  try {
    const res = await previewFilter({ expr: form.filter_expr, target: 'node' })
    previewNodes.value = res.data.nodes ?? []
  } catch {
    previewNodes.value = []
  } finally {
    previewLoading.value = false
  }
}

onMounted(fetchSponsors)
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px">
      <h2 style="margin: 0">赞助商管理</h2>
      <el-button type="primary" @click="openCreate">+ 新建赞助商</el-button>
    </div>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" style="width: 100%" row-key="id">
        <el-table-column prop="name" label="名称" width="130" />
        <el-table-column prop="text" label="文本" min-width="120" show-overflow-tooltip />
        <el-table-column label="过滤表达式" min-width="200">
          <template #default="{ row }">
            <code style="font-size: 12px; color: #606266">
              {{ row.filter_expr.length > 60 ? row.filter_expr.slice(0, 60) + '…' : row.filter_expr }}
            </code>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100" sortable />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 12px; justify-content: flex-end; display: flex"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>

    <!-- 新建 / 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="580px">
      <el-form label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="赞助商名称" />
        </el-form-item>
        <el-form-item label="文本">
          <el-input v-model="form.text" placeholder="附加到节点名称的文字" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="form.priority" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item label="过滤表达式">
          <div style="width: 100%">
            <ExprEditor v-model="form.filter_expr" placeholder="输入 expr-lang 过滤表达式…" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handlePreview">预览匹配节点</el-button>
        <el-button type="primary" :loading="formLoading" @click="submitForm">
          {{ isEditing ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 预览匹配节点对话框 -->
    <el-dialog v-model="previewVisible" title="预览匹配节点（最多 100 条）" width="700px">
      <el-table v-loading="previewLoading" :data="previewNodes" size="small" max-height="400">
        <el-table-column prop="protocol" label="协议" width="80" />
        <el-table-column prop="server" label="服务器" min-width="160" show-overflow-tooltip />
        <el-table-column prop="region" label="区域" width="65" />
        <el-table-column label="存活" width="70">
          <template #default="{ row }">
            <StatusTag :status="row.alive ? 'alive' : 'dead'" />
          </template>
        </el-table-column>
        <el-table-column label="分数" width="110">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(row.score * 100)" :stroke-width="8" />
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!previewLoading && previewNodes.length === 0" style="text-align: center; padding: 20px; color: #909399">
        无匹配节点
      </div>
    </el-dialog>
  </div>
</template>


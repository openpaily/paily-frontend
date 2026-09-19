<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ExprEditor from '../components/ExprEditor.vue'
import StatusTag from '../components/StatusTag.vue'
import { previewFilter } from '../api/filter'
import type { NodeSummary, SourceSummary, FilterTarget } from '../types/api'

const activeTab = ref<FilterTarget>('node')

// node tab
const nodeExpr = ref('')
const nodeResults = ref<NodeSummary[]>([])
const nodeLoading = ref(false)

// source tab
const sourceExpr = ref('')
const sourceResults = ref<SourceSummary[]>([])
const sourceLoading = ref(false)

async function previewNodes() {
  if (!nodeExpr.value.trim()) { ElMessage.warning('请输入表达式'); return }
  nodeLoading.value = true
  try {
    const res = await previewFilter({ expr: nodeExpr.value.trim(), target: 'node' })
    nodeResults.value = res.data.nodes ?? []
    ElMessage.success(`匹配 ${nodeResults.value.length} 个节点`)
  } catch { nodeResults.value = [] } finally { nodeLoading.value = false }
}

async function previewSources() {
  if (!sourceExpr.value.trim()) { ElMessage.warning('请输入表达式'); return }
  sourceLoading.value = true
  try {
    const res = await previewFilter({ expr: sourceExpr.value.trim(), target: 'source' })
    sourceResults.value = res.data.sources ?? []
    ElMessage.success(`匹配 ${sourceResults.value.length} 个来源`)
  } catch { sourceResults.value = [] } finally { sourceLoading.value = false }
}
</script>

<template>
  <div>
    <h2 style="margin: 0 0 16px">过滤测试台</h2>
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <!-- 节点过滤 -->
        <el-tab-pane label="节点 (node)" name="node">
          <el-row :gutter="16">
            <el-col :span="10">
              <div style="margin-bottom: 8px; font-weight: 500">expr-lang 表达式</div>
              <ExprEditor v-model="nodeExpr" placeholder="Alive == true && Score > 0.5" />
              <el-button
                type="primary"
                style="margin-top: 10px"
                :loading="nodeLoading"
                @click="previewNodes"
              >预览匹配节点</el-button>
            </el-col>
            <el-col :span="14">
              <div style="margin-bottom: 8px; font-weight: 500">
                匹配结果（最多 100 条）
                <el-tag size="small" style="margin-left: 6px">{{ nodeResults.length }}</el-tag>
              </div>
              <el-table :data="nodeResults" v-loading="nodeLoading" size="small" max-height="500">
                <el-table-column prop="protocol" label="协议" width="80" />
                <el-table-column prop="server" label="服务器" min-width="160" show-overflow-tooltip />
                <el-table-column prop="region" label="区域" width="65" />
                <el-table-column label="分数" width="110">
                  <template #default="{ row }">
                    <el-progress :percentage="Math.round(row.score * 100)" :stroke-width="8" />
                  </template>
                </el-table-column>
                <el-table-column label="存活" width="70">
                  <template #default="{ row }">
                    <StatusTag :status="row.alive ? 'alive' : 'dead'" />
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="!nodeLoading && nodeResults.length === 0" style="text-align:center;padding:24px;color:#909399">
                暂无结果，请输入表达式后点击预览
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 来源过滤 -->
        <el-tab-pane label="来源 (source)" name="source">
          <el-row :gutter="16">
            <el-col :span="10">
              <div style="margin-bottom: 8px; font-weight: 500">expr-lang 表达式</div>
              <ExprEditor v-model="sourceExpr" placeholder="输入来源过滤表达式…" target="source" />
              <el-button
                type="primary"
                style="margin-top: 10px"
                :loading="sourceLoading"
                @click="previewSources"
              >预览匹配来源</el-button>
            </el-col>
            <el-col :span="14">
              <div style="margin-bottom: 8px; font-weight: 500">
                匹配结果（最多 100 条）
                <el-tag size="small" style="margin-left: 6px">{{ sourceResults.length }}</el-tag>
              </div>
              <el-table :data="sourceResults" v-loading="sourceLoading" size="small" max-height="500">
                <el-table-column prop="type" label="类型" width="85" />
                <el-table-column prop="identifier" label="标识符" min-width="140" show-overflow-tooltip />
                <el-table-column prop="info" label="描述" min-width="120" show-overflow-tooltip />
                <el-table-column label="状态" width="80">
                  <template #default="{ row }">
                    <StatusTag :status="row.status" />
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="!sourceLoading && sourceResults.length === 0" style="text-align:center;padding:24px;color:#909399">
                暂无结果，请输入表达式后点击预览
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>


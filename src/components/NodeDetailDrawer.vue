<script setup lang="ts">
import { ref, watch } from 'vue'
import { getNode, getInitialChecks, getDeepChecks } from '../api/nodes'
import { getCheckers } from '../api/checkers'
import StatusTag from './StatusTag.vue'
import type { NodeDetail, InitialCheckRecord, DeepCheckRecord } from '../types/api'

const props = defineProps<{ nodeId: string; modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'open-source', id: string): void
}>()

const detail = ref<NodeDetail | null>(null)
const loadingDetail = ref(false)
const activeTab = ref('info')

// initial checks
const initialChecks = ref<InitialCheckRecord[]>([])
const initialTotal = ref(0)
const initialPage = ref(1)
const loadingInitial = ref(false)
const initialTagFilter = ref('')

// deep checks
const deepChecks = ref<DeepCheckRecord[]>([])
const deepTotal = ref(0)
const deepPage = ref(1)
const loadingDeep = ref(false)
const deepTagFilter = ref('')

// checker tags for filter selects
const checkerTags = ref<string[]>([])

async function loadDetail() {
  loadingDetail.value = true
  try {
    const res = await getNode(props.nodeId)
    detail.value = res.data
  } finally {
    loadingDetail.value = false
  }
}

async function loadInitialChecks(p = 1) {
  loadingInitial.value = true
  try {
    const params: Record<string, unknown> = { page: p, limit: 20 }
    if (initialTagFilter.value) params.tag = initialTagFilter.value
    const res = await getInitialChecks(props.nodeId, params)
    initialChecks.value = res.data.data
    initialTotal.value = res.data.pagination.total
    initialPage.value = p
  } finally {
    loadingInitial.value = false
  }
}

async function loadDeepChecks(p = 1) {
  loadingDeep.value = true
  try {
    const params: Record<string, unknown> = { page: p, limit: 20 }
    if (deepTagFilter.value) params.tag = deepTagFilter.value
    const res = await getDeepChecks(props.nodeId, params)
    deepChecks.value = res.data.data
    deepTotal.value = res.data.pagination.total
    deepPage.value = p
  } finally {
    loadingDeep.value = false
  }
}

watch(
  () => [props.modelValue, props.nodeId] as const,
  ([open]) => {
    if (open) {
      activeTab.value = 'info'
      detail.value = null
      initialChecks.value = []
      deepChecks.value = []
      initialTagFilter.value = ''
      deepTagFilter.value = ''
      loadDetail()
      getCheckers().then(r => { checkerTags.value = r.data.checkers }).catch(() => { })
    }
  },
  { immediate: true },
)

function onTabChange(tab: string) {
  if (tab === 'initial' && initialChecks.value.length === 0) loadInitialChecks()
  if (tab === 'deep' && deepChecks.value.length === 0) loadDeepChecks()
}

function parseStreaming(raw: unknown): Record<string, boolean> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw as Record<string, boolean>
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <el-drawer :model-value="modelValue" title="节点详情" size="680px" @close="close">
    <div v-loading="loadingDetail" style="min-height: 200px">
      <el-tabs v-if="detail" v-model="activeTab" @tab-change="onTabChange">
        <!-- Tab 1: 基本信息 -->
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
            <el-descriptions-item label="Hash">{{ detail.hash }}</el-descriptions-item>
            <el-descriptions-item label="协议">{{ detail.protocol }}</el-descriptions-item>
            <el-descriptions-item label="服务器">{{ detail.server }}</el-descriptions-item>
            <el-descriptions-item label="区域">{{ detail.region }}</el-descriptions-item>
            <el-descriptions-item label="存活">
              <StatusTag :status="detail.alive ? 'alive' : 'dead'" />
            </el-descriptions-item>
            <el-descriptions-item label="分数">
              <div style="display: flex; align-items: center">
                <el-progress :percentage="Math.round(detail.score * 100)"
                  :status="detail.score >= 0.6 ? 'success' : detail.score >= 0.3 ? 'warning' : 'exception'"
                  :stroke-width="10" style="flex: 1" />
                <span style="font-size: 11px; color: #606266; white-space: nowrap">{{ detail.score.toFixed(3) }}</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="密码">{{ detail.password ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ detail.updated_at }}</el-descriptions-item>
          </el-descriptions>

          <!-- streaming / deep check per-tag -->
          <div style="margin-top: 16px">
            <h4 style="margin: 0 0 8px">复筛检测结果（按 Checker）</h4>
            <template v-if="detail.latest_deep_check_by_tag && Object.keys(detail.latest_deep_check_by_tag).length">
              <el-collapse>
                <el-collapse-item v-for="(dc, tag) in detail.latest_deep_check_by_tag" :key="tag" :name="tag">
                  <template #title>
                    <span style="font-weight: 600">{{ tag }}</span>
                    <span style="font-size: 12px; color: #606266; margin-left: 12px">
                      延迟 {{ dc.avg_latency_ms }} ms &nbsp;·&nbsp; 抖动 {{ dc.jitter_ms }} ms &nbsp;·&nbsp; {{
                        dc.speed_kbps }} kbps
                    </span>
                  </template>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px">
                    <template v-for="(val, key) in parseStreaming(dc.streaming_result)" :key="key">
                      <el-tag :type="val ? 'success' : 'info'" size="small">{{ key }}: {{ val ? '✓' : '✗' }}</el-tag>
                    </template>
                    <span v-if="!Object.keys(parseStreaming(dc.streaming_result)).length"
                      style="color: #909399; font-size: 12px">无流媒体数据</span>
                  </div>
                  <div style="font-size: 12px; color: #909399">检测时间: {{ dc.checked_at }}</div>
                </el-collapse-item>
              </el-collapse>
            </template>
            <template v-else-if="detail.latest_deep_check">
              <!-- fallback to legacy single record -->
              <div style="display: flex; flex-wrap: wrap; gap: 6px">
                <template v-for="(val, key) in parseStreaming(detail.latest_deep_check.streaming_result)" :key="key">
                  <el-tag :type="val ? 'success' : 'info'" size="small">{{ key }}: {{ val ? '✓' : '✗' }}</el-tag>
                </template>
                <span v-if="!Object.keys(parseStreaming(detail.latest_deep_check?.streaming_result)).length"
                  style="color: #909399; font-size: 13px">无数据</span>
              </div>
              <el-descriptions :column="3" border size="small" style="margin-top: 12px">
                <el-descriptions-item label="平均延迟">{{ detail.latest_deep_check.avg_latency_ms }}
                  ms</el-descriptions-item>
                <el-descriptions-item label="抖动">{{ detail.latest_deep_check.jitter_ms }} ms</el-descriptions-item>
                <el-descriptions-item label="速度">{{ detail.latest_deep_check.speed_kbps }} kbps</el-descriptions-item>
              </el-descriptions>
            </template>
            <span v-else style="font-size: 13px; color: #909399">暂无复筛检测数据</span>
          </div>

          <!-- raw json -->
          <div v-if="detail.raw" style="margin-top: 16px">
            <h4 style="margin: 0 0 8px">节点配置</h4>
            <pre
              style="background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px; overflow: auto; max-height: 300px; text-align: left; white-space: pre; word-break: normal">
    {{ JSON.stringify(detail.raw, null, 2) }}</pre>
          </div>

          <!-- sources -->
          <div v-if="detail.sources && detail.sources.length" style="margin-top: 16px">
            <h4 style="margin: 0 0 8px">关联来源（{{ detail.sources.length }}）</h4>
            <el-tag v-for="src in detail.sources" :key="src.id" style="margin: 2px; cursor: pointer" size="small"
              @click="emit('open-source', src.id)">{{ src.info || src.identifier || src.id }}</el-tag>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 初步检测历史 -->
        <el-tab-pane label="初步检测" name="initial">
          <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center">
            <span style="font-size: 13px">Checker:</span>
            <el-select v-model="initialTagFilter" placeholder="全部" clearable size="small" style="width: 140px"
              @change="loadInitialChecks(1)">
              <el-option v-for="t in checkerTags" :key="t" :label="t" :value="t" />
            </el-select>
          </div>
          <el-table v-loading="loadingInitial" :data="initialChecks" size="small">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="checker_tag" label="Checker" width="120" />
            <el-table-column prop="latency_ms" label="延迟 (ms)" width="100" />
            <el-table-column prop="checked_at" label="检测时间" />
          </el-table>
          <el-pagination v-model:current-page="initialPage" :total="initialTotal" :page-size="20"
            layout="total, prev, pager, next" style="margin-top: 8px; justify-content: flex-end; display: flex"
            @current-change="loadInitialChecks" />
        </el-tab-pane>

        <!-- Tab 3: 深度检测历史 -->
        <el-tab-pane label="深度检测" name="deep">
          <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center">
            <span style="font-size: 13px">Checker:</span>
            <el-select v-model="deepTagFilter" placeholder="全部" clearable size="small" style="width: 140px"
              @change="loadDeepChecks(1)">
              <el-option v-for="t in checkerTags" :key="t" :label="t" :value="t" />
            </el-select>
          </div>
          <el-table v-loading="loadingDeep" :data="deepChecks" size="small">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="checker_tag" label="Checker" width="120" />
            <el-table-column prop="avg_latency_ms" label="平均延迟" width="90" />
            <el-table-column prop="jitter_ms" label="抖动" width="70" />
            <el-table-column prop="speed_kbps" label="速度 kbps" width="100" />
            <el-table-column label="流媒体" min-width="160">
              <template #default="{ row }">
                <span v-for="(val, key) in parseStreaming(row.streaming_result)" :key="key"
                  style="margin-right: 6px; font-size: 12px">
                  {{ key }}: {{ val ? '✓' : '✗' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="checked_at" label="检测时间" width="160" />
          </el-table>
          <el-pagination v-model:current-page="deepPage" :total="deepTotal" :page-size="20"
            layout="total, prev, pager, next" style="margin-top: 8px; justify-content: flex-end; display: flex"
            @current-change="loadDeepChecks" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

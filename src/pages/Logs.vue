<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getFetchLogs, getCheckLogs } from '../api/logs'
import StatusTag from '../components/StatusTag.vue'
import SourceDetailDrawer from '../components/SourceDetailDrawer.vue'
import NodeDetailDrawer from '../components/NodeDetailDrawer.vue'
import type { FetchLogEntry, CheckLogEntry } from '../types/api'

const activeTab = ref('fetch')

// ── drawers ───────────────────────────────────────────────────────────
const sourceDrawerVisible = ref(false)
const selectedSourceId = ref<string | null>(null)
const nodeDrawerVisible = ref(false)
const selectedNodeId = ref<string | null>(null)

function openSource(id: string) { selectedSourceId.value = id; sourceDrawerVisible.value = true }
function openNode(id: string) { selectedNodeId.value = id; nodeDrawerVisible.value = true }

// ── Fetch logs ────────────────────────────────────────────────────────
const fetchLogs = ref<FetchLogEntry[]>([])
const fetchTotal = ref(0)
const fetchPage = ref(1)
const fetchPageSize = ref(20)
const fetchLoading = ref(false)
const fetchFilter = reactive({ source_id: '' })

async function loadFetchLogs(p = fetchPage.value) {
  fetchLoading.value = true
  fetchPage.value = p
  try {
    const params: Record<string, unknown> = { page: p, limit: fetchPageSize.value }
    if (fetchFilter.source_id) params.source_id = fetchFilter.source_id
    const res = await getFetchLogs(params)
    fetchLogs.value = res.data.data
    fetchTotal.value = res.data.pagination.total
  } catch { /* handled globally */ } finally {
    fetchLoading.value = false
  }
}

function handleFetchFilter() { loadFetchLogs(1) }
function handleFetchPage(p: number) { loadFetchLogs(p) }
function handleFetchSize(s: number) { fetchPageSize.value = s; loadFetchLogs(1) }

// ── Check logs ────────────────────────────────────────────────────────
const checkLogs = ref<CheckLogEntry[]>([])
const checkTotal = ref(0)
const checkPage = ref(1)
const checkPageSize = ref(20)
const checkLoading = ref(false)
const checkFilter = reactive({ node_id: '' })

async function loadCheckLogs(p = checkPage.value) {
  checkLoading.value = true
  checkPage.value = p
  try {
    const params: Record<string, unknown> = { page: p, limit: checkPageSize.value }
    if (checkFilter.node_id) params.node_id = checkFilter.node_id
    const res = await getCheckLogs(params)
    checkLogs.value = res.data.data
    checkTotal.value = res.data.pagination.total
  } catch { /* handled globally */ } finally {
    checkLoading.value = false
  }
}

function handleCheckFilter() { loadCheckLogs(1) }
function handleCheckPage(p: number) { loadCheckLogs(p) }
function handleCheckSize(s: number) { checkPageSize.value = s; loadCheckLogs(1) }

function onTabChange(tab: string) {
  if (tab === 'check' && checkLogs.value.length === 0) loadCheckLogs(1)
}

function truncate(s: string, n = 20) {
  return s && s.length > n ? s.slice(0, n) + '…' : s
}

onMounted(() => loadFetchLogs(1))
</script>

<template>
  <div>
    <h2 style="margin: 0 0 16px">日志</h2>
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="onTabChange">

        <!-- 抓取日志 -->
        <el-tab-pane label="抓取日志" name="fetch">
          <el-form inline style="margin-bottom: 12px" @submit.prevent="handleFetchFilter">
            <el-form-item label="来源 ID">
              <el-input v-model="fetchFilter.source_id" placeholder="UUID" clearable style="width: 260px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleFetchFilter">查询</el-button>
              <el-button @click="fetchFilter.source_id = ''; handleFetchFilter()">重置</el-button>
            </el-form-item>
          </el-form>
          <el-table v-loading="fetchLoading" :data="fetchLogs" size="small">
            <el-table-column label="ID" prop="id" width="70" />
            <el-table-column label="来源 ID" min-width="300">
              <template #default="{ row }">
                <el-button link type="primary" style="font-size: 12px; font-family: monospace; padding: 0" @click="openSource(row.source_id)">
                  {{ row.source_id }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="80">
              <template #default="{ row }">
                <StatusTag :status="row.success ? '成功' : '失败'" />
              </template>
            </el-table-column>
            <el-table-column prop="node_count" label="节点数" width="80" />
            <el-table-column prop="fetched_at" label="抓取时间" min-width="160" />
          </el-table>
          <el-pagination
            v-model:current-page="fetchPage"
            v-model:page-size="fetchPageSize"
            :total="fetchTotal"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 12px; justify-content: flex-end; display: flex"
            @current-change="handleFetchPage"
            @size-change="handleFetchSize"
          />
        </el-tab-pane>

        <!-- 检测日志 -->
        <el-tab-pane label="检测日志" name="check">
          <el-form inline style="margin-bottom: 12px" @submit.prevent="handleCheckFilter">
            <el-form-item label="节点 ID">
              <el-input v-model="checkFilter.node_id" placeholder="UUID" clearable style="width: 260px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleCheckFilter">查询</el-button>
              <el-button @click="checkFilter.node_id = ''; handleCheckFilter()">重置</el-button>
            </el-form-item>
          </el-form>
          <el-table v-loading="checkLoading" :data="checkLogs" size="small">
            <el-table-column label="ID" prop="id" width="70" />
            <el-table-column label="节点 ID" min-width="300">
              <template #default="{ row }">
                <el-button link type="primary" style="font-size: 12px; font-family: monospace; padding: 0" @click="openNode(row.node_id)">
                  {{ row.node_id }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="延迟 (ms)" prop="latency_ms" width="100" />
            <el-table-column prop="checked_at" label="检测时间" min-width="160" />
          </el-table>
          <el-pagination
            v-model:current-page="checkPage"
            v-model:page-size="checkPageSize"
            :total="checkTotal"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 12px; justify-content: flex-end; display: flex"
            @current-change="handleCheckPage"
            @size-change="handleCheckSize"
          />
        </el-tab-pane>

      </el-tabs>
    </el-card>

    <SourceDetailDrawer
      v-if="selectedSourceId"
      v-model="sourceDrawerVisible"
      :source-id="selectedSourceId"
      @open-node="openNode"
    />
    <NodeDetailDrawer
      v-if="selectedNodeId"
      v-model="nodeDrawerVisible"
      :node-id="selectedNodeId"
      @open-source="openSource"
    />
  </div>
</template>


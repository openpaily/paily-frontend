<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getStats } from '../api/stats'

interface Stats {
  totalNodes: number | null
  aliveNodes: number | null
  totalSources: number | null
  deadSources: number | null
}

const stats = ref<Stats>({
  totalNodes: null,
  aliveNodes: null,
  totalSources: null,
  deadSources: null,
})
const loading = ref(true)

const BASE = import.meta.env.VITE_API_BASE as string
const subscriptions = [
  { label: 'Clash', url: `${BASE}/clash`, desc: 'Clash 订阅' },
  { label: 'Sing-box', url: `${BASE}/singbox`, desc: 'Sing-box 订阅' },
  { label: 'Base64', url: `${BASE}/base64`, desc: 'Base64 订阅' },
]

async function copyUrl(url: string) {
  await navigator.clipboard.writeText(url)
  ElMessage.success('已复制到剪贴板')
}

async function fetchStats() {
  loading.value = true
  try {
    const res = await getStats()
    stats.value.totalNodes = res.data.total_nodes
    stats.value.aliveNodes = res.data.alive_nodes
    stats.value.totalSources = res.data.total_sources
    stats.value.deadSources = res.data.dead_sources
  } catch {
    // errors handled globally in request.ts
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>

<template>
  <div>
    <h2 style="margin: 0 0 20px">仪表盘</h2>

    <!-- 概览卡片 -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">节点总数</div>
            <div class="stat-value">
              <span v-if="loading">—</span>
              <span v-else>{{ stats.totalNodes ?? '—' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">存活节点</div>
            <div class="stat-value alive">
              <span v-if="loading">—</span>
              <span v-else>{{ stats.aliveNodes ?? '—' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">来源总数</div>
            <div class="stat-value">
              <span v-if="loading">—</span>
              <span v-else>{{ stats.totalSources ?? '—' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">死亡来源</div>
            <div class="stat-value dead">
              <span v-if="loading">—</span>
              <span v-else>{{ stats.deadSources ?? '—' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 订阅链接 -->
    <el-card shadow="never">
      <template #header>
        <span>订阅链接</span>
      </template>
      <el-row :gutter="16">
        <el-col v-for="sub in subscriptions" :key="sub.label" :span="8">
          <el-card shadow="hover" style="margin-bottom: 0; height: 100%">
            <div class="sub-card">
              <div style="text-align: left; min-width: 0">
                <div class="sub-label">{{ sub.label }}</div>
                <div class="sub-desc">{{ sub.desc }}</div>
                <div class="sub-url">{{ sub.url }}</div>
              </div>
              <el-button size="small" type="primary" plain @click="copyUrl(sub.url)">
                复制链接
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped>
.stat-card {
  text-align: center;
  padding: 8px 0;
}

.stat-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #303133;
}

.stat-value.alive {
  color: #67c23a;
}

.stat-value.dead {
  color: #f56c6c;
}

.sub-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.sub-label {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.sub-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.sub-url {
  font-size: 12px;
  color: #409eff;
  word-break: break-all;
}
</style>

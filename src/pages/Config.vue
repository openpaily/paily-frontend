<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import ExprEditor from '../components/ExprEditor.vue'
import { getConfig, updateConfig } from '../api/config'
import type { ConfigMap } from '../types/api'

// Keys with friendly labels; all others rendered generically
const KEY_LABELS: Record<string, string> = {
  max_distribute: '最大分发节点数',
  dead_latency_ms: '初筛 dead 延迟阈值 (ms)',
  fetch_dead_window_days: '来源拉取 dead 判断窗口（天）',
  node_dead_window_days: '节点全 dead 判断窗口（天）',
  fetch_history_window_days: '抓取历史保留天数',
  initial_check_history_days: '初筛历史保留天数（已弃用）',
  deep_check_history_days: '复筛历史保留天数（已弃用）',
  score_decay_alpha: 'EWMA 衰减因子',
  score_weight_latency: '评分权重·延迟',
  score_weight_stability: '评分权重·稳定性',
  score_weight_speed: '评分权重·速度',
  grade_a_min: 'A 级最低分',
  grade_b_min: 'B 级最低分',
  grade_c_min: 'C 级最低分',
  min_fetch_samples: 'fetch dead 触发最少记录数',
  min_check_samples: 'node dead 触发最少初筛数',
  cleanup_interval_minutes: '历史清理周期（分钟）',
  default_sponsor_text: '默认 Sponsor 文字',
  node_name_template: '节点命名模板（expr-lang）',
  fetch_interval_minutes: '抓取间隔（分钟）',
  filename_clash: "Clash 配置文件名",
  filename_singbox: "Sing-box 配置文件名",
  filename_base64: "Base64 配置文件名",
  score_latency_curve_k: '延迟评分对数衰减曲线斜率 (k)',
  score_jitter_linear_threshold_ms: '抖动线性阈值 (ms)',
  node_distribute_filter: '分发过滤器（expr-lang，返回 true 则不分发）',
  node_alive_check_window_minutes: '存活联合评价窗口（分钟，0=单次提交即决定）',
  check_run_history_days: 'Checker 提交记录最大历史天数',
}

const loading = ref(false)
const saving = ref(false)
// original from server, used to detect keys
const serverKeys = ref<string[]>([])
// local editable copy
const localConfig = reactive<ConfigMap>({})

async function loadConfig() {
  loading.value = true
  try {
    const res = await getConfig()
    const data = res.data
    serverKeys.value = Object.keys(data)
    // populate local copy
    Object.assign(localConfig, data)
    // ensure all labelled keys always appear even if server omitted them
    const DEFAULTS: Record<string, string> = {
      "max_distribute": "200",
      "dead_latency_ms": "3000",
      "fetch_dead_window_days": "7",
      "node_dead_window_days": "4",
      "fetch_history_window_days": "7",
      "initial_check_history_days": "3",
      "deep_check_history_days": "7",
      "score_decay_alpha": "0.7",
      "score_weight_latency": "0.7",
      "score_weight_stability": "0.3",
      "score_weight_speed": "0.55",
      "score_latency_curve_k": "0.3",
      "score_jitter_linear_threshold_ms": "200",
      "grade_a_min": "0.75",
      "grade_b_min": "0.50",
      "grade_c_min": "0.25",
      "cleanup_interval_minutes": "30",
      "default_sponsor_text": "",
      "node_distribute_filter": "",
      "node_name_template": `(unlock_flags != "" ? "[" + unlock_flags + "] " : "") + node.grade + " - " + node.region_flag + " " + node.region + " " + node.seq + (node.sponsor != "" ? " " + node.sponsor : "")`,
      "filename_clash": "Paily Connect.yaml",
      "filename_singbox": "Paily Connect.json",
      "filename_base64": "Paily Connect.txt",
      "node_alive_check_window_minutes": "240",
      "check_run_history_days": "7",
    }
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (!serverKeys.value.includes(k)) {
        serverKeys.value.push(k)
        localConfig[k] = v
      }
    }
  } catch { /* handled globally */ } finally {
    loading.value = false
  }
}

function validate(): boolean {
  const fh = Number(localConfig['fetch_history_window_days'])
  const fd = Number(localConfig['fetch_dead_window_days'])
  const ih = Number(localConfig['initial_check_history_days'])
  const nd = Number(localConfig['node_dead_window_days'])

  if (!isNaN(fh) && !isNaN(fd) && fh < fd) {
    ElMessage.warning('抓取历史保留天数 必须 ≥ 来源死亡判定天数')
    return false
  }
  if (!isNaN(ih) && !isNaN(nd) && ih < nd) {
    ElMessage.warning('初步检测历史保留天数 必须 ≥ 节点死亡判定天数')
    return false
  }
  return true
}

async function saveConfig() {
  if (!validate()) return
  saving.value = true
  try {
    // Full overwrite — send entire localConfig
    const payload: ConfigMap = {}
    for (const k of serverKeys.value) {
      payload[k] = localConfig[k] ?? ''
    }
    await updateConfig(payload)
    ElMessage.success('配置已保存')
  } catch { /* handled globally */ } finally {
    saving.value = false
  }
}

// keys that get special ExprEditor rendering
const EXPR_KEYS = ['node_name_template', 'node_distribute_filter']

// keys other than expr keys, rendered as plain inputs
function normalKeys(): string[] {
  return serverKeys.value.filter((k) => !EXPR_KEYS.includes(k))
}

onMounted(loadConfig)
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px">
      <h2 style="margin: 0">运行时配置</h2>
      <div>
        <el-button @click="loadConfig" :loading="loading" style="margin-right: 8px">重新加载</el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">保存全部</el-button>
      </div>
    </div>

    <el-card shadow="never" v-loading="loading">
      <el-form label-width="260px" label-position="left">
        <!-- All normal keys -->
        <template v-for="key in normalKeys()" :key="key">
          <el-form-item :label="KEY_LABELS[key] ?? key">
            <el-input v-model="localConfig[key]" style="max-width: 320px" :placeholder="key" />
          </el-form-item>
        </template>

        <!-- node_name_template — special ExprEditor -->
        <el-form-item v-if="serverKeys.includes('node_name_template')" label="节点命名模板（expr-lang）"
          style="align-items: flex-start">
          <div style="width: 100%; max-width: 600px">
            <ExprEditor v-model="localConfig['node_name_template']" target="node-name"
              placeholder="例：node.region_flag + ' ' + node.region + ' ' + node.grade + ' ' + node.seq" />
          </div>
        </el-form-item>

        <!-- node_distribute_filter — ExprEditor, returns bool -->
        <el-form-item v-if="serverKeys.includes('node_distribute_filter')" label="分发过滤器（expr-lang）"
          style="align-items: flex-start">
          <div style="width: 100%; max-width: 600px">
            <ExprEditor v-model="localConfig['node_distribute_filter']"
              placeholder="例：Alive == false　返回 true 的节点将被排除在分发写之外" />
          </div>
        </el-form-item>
      </el-form>

      <div v-if="serverKeys.length === 0 && !loading" style="text-align:center;padding:40px;color:#909399">
        暂无配置项
      </div>
    </el-card>
  </div>
</template>

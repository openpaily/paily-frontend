<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getFormatConfig, updateFormatConfig } from '../api/formatConfigs'
import type { FormatName } from '../api/formatConfigs'

const BASE = import.meta.env.VITE_API_BASE as string

const formats: FormatName[] = ['clash', 'singbox', 'base64']
const subUrls: Record<FormatName, string> = {
  clash: `${BASE}/clash`,
  singbox: `${BASE}/singbox`,
  base64: `${BASE}/base64`,
}
const formatLabels: Record<FormatName, string> = {
  clash: 'Clash',
  singbox: 'Sing-box',
  base64: 'Base64',
}

interface TabState {
  config: Record<string, unknown>
  loading: boolean
  saving: boolean
  loaded: boolean
}

const activeTab = ref<FormatName>('clash')
const tabs = reactive<Record<FormatName, TabState>>({
  clash:   { config: {}, loading: false, saving: false, loaded: false },
  singbox: { config: {}, loading: false, saving: false, loaded: false },
  base64:  { config: {}, loading: false, saving: false, loaded: false },
})

async function loadTab(fmt: FormatName) {
  const t = tabs[fmt]
  if (t.loaded) return
  t.loading = true
  try {
    const res = await getFormatConfig(fmt)
    // Replace reactive object keys with fresh data
    for (const k of Object.keys(t.config)) delete (t.config as Record<string, unknown>)[k]
    Object.assign(t.config, res.data.config)
    // Always show template field for clash/singbox even if server omitted it
    if ((fmt === 'clash' || fmt === 'singbox') && !('template' in t.config)) {
      t.config['template'] = ''
    }
    t.loaded = true
  } catch { /* handled globally */ } finally {
    t.loading = false
  }
}

async function reloadTab(fmt: FormatName) {
  tabs[fmt].loaded = false
  await loadTab(fmt)
}

async function saveTab(fmt: FormatName) {
  const t = tabs[fmt]
  t.saving = true
  try {
    await updateFormatConfig(fmt, { config: t.config })
    ElMessage.success(`${formatLabels[fmt]} 配置已保存`)
  } catch { /* handled globally */ } finally {
    t.saving = false
  }
}

async function copyUrl(url: string) {
  await navigator.clipboard.writeText(url)
  ElMessage.success('已复制到剪贴板')
}

function onTabChange(fmt: string) {
  loadTab(fmt as FormatName)
}

// clash/singbox: "template" key → large textarea
// base64: "default" key → enum select
function fieldType(fmt: FormatName, key: string): 'template' | 'base64default' | 'generic' {
  if ((fmt === 'clash' || fmt === 'singbox') && key === 'template') return 'template'
  if (fmt === 'base64' && key === 'default') return 'base64default'
  return 'generic'
}

function strVal(v: unknown): string {
  return v == null ? '' : String(v)
}

onMounted(() => loadTab('clash'))
</script>

<template>
  <div>
    <h2 style="margin: 0 0 16px">格式配置</h2>
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane v-for="fmt in formats" :key="fmt" :label="formatLabels[fmt]" :name="fmt">
          <div v-loading="tabs[fmt].loading" style="min-height: 200px">

            <el-form label-width="120px" label-position="left">
              <template v-for="(_, key) in tabs[fmt].config" :key="key">

                <!-- clash / singbox: template → large monospace textarea -->
                <el-form-item
                  v-if="fieldType(fmt, key) === 'template'"
                  :label="key"
                  style="align-items: flex-start"
                >
                  <el-input
                    :model-value="strVal(tabs[fmt].config[key])"
                    @update:model-value="tabs[fmt].config[key] = $event"
                    type="textarea"
                    :rows="20"
                    :placeholder="key"
                    style="font-family: monospace; font-size: 12px; width: 100%"
                  />
                </el-form-item>

                <!-- base64: default → enum select -->
                <el-form-item
                  v-else-if="fieldType(fmt, key) === 'base64default'"
                  label="default"
                >
                  <el-select
                    :model-value="strVal(tabs[fmt].config[key])"
                    @update:model-value="tabs[fmt].config[key] = $event"
                    style="width: 240px"
                  >
                    <el-option label="v2rayn" value="v2rayn" />
                    <el-option label="subconverter" value="subconverter" />
                  </el-select>
                </el-form-item>

                <!-- generic key → plain input -->
                <el-form-item v-else :label="key">
                  <el-input
                    :model-value="strVal(tabs[fmt].config[key])"
                    @update:model-value="tabs[fmt].config[key] = $event"
                    style="max-width: 360px"
                    :placeholder="key"
                  />
                </el-form-item>

              </template>

              <div v-if="Object.keys(tabs[fmt].config).length === 0 && !tabs[fmt].loading"
                style="color: #909399; padding: 20px 0">
                暂无字段
              </div>
            </el-form>

            <!-- footer bar -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1px solid #ebeef5">
              <div style="display: flex; align-items: center; gap: 10px">
                <span style="font-size: 13px; color: #606266">订阅链接：</span>
                <span style="font-size: 13px; color: #409eff">{{ subUrls[fmt] }}</span>
                <el-button size="small" plain @click="copyUrl(subUrls[fmt])">复制</el-button>
              </div>
              <div style="display: flex; gap: 8px">
                <el-button @click="reloadTab(fmt)">重新加载</el-button>
                <el-button type="primary" :loading="tabs[fmt].saving" @click="saveTab(fmt)">保 存</el-button>
              </div>
            </div>

          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>


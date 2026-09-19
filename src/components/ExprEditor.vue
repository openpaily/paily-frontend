<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
  target?: 'node' | 'node-name' | 'source'
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const nodeFields = [
  { name: 'Server', type: 'string', desc: '服务器地址' },
  { name: 'Protocol', type: 'string', desc: '协议类型（vmess/trojan/ss…）' },
  { name: 'Password', type: 'string', desc: '密码／密钥' },
  { name: 'Hash', type: 'string', desc: '节点唯一哈希' },
  { name: 'Region', type: 'string', desc: '区域代码（US/HK/JP…）' },
  { name: 'Alive', type: 'bool', desc: '是否存活' },
  { name: 'Score', type: 'float', desc: '评分 0~1' },
  { name: 'SourceIDs', type: '[]string', desc: '来源 UUID 列表' },
  { name: 'Sources', type: '[]SourceInfo', desc: '来源详情列表（.ID/.Type/.Identifier/.Info/.Status/.Content）' },
  { name: 'Streaming', type: 'map[string]bool', desc: '解锁标志，如 Streaming["netflix"]' },
  { name: 'RawConfig', type: 'map[string]any', desc: '解析后的 clash proxy 配置原始字段' },
]

const nameFields = [
  { name: 'node.region', type: 'string', desc: '区域代码（US/HK/JP…）' },
  { name: 'node.region_flag', type: 'string', desc: '区域旗帜 emoji' },
  { name: 'node.grade', type: 'string', desc: '等级（A/B/C/D）' },
  { name: 'node.score', type: 'float', desc: '评分 0~1' },
  { name: 'node.seq', type: 'string', desc: '序号字符串' },
  { name: 'node.server', type: 'string', desc: '服务器地址' },
  { name: 'node.protocol', type: 'string', desc: '协议类型' },
  { name: 'node.alive', type: 'bool', desc: '是否存活' },
  { name: 'node.streaming', type: 'map[string]bool', desc: '解锁标志，如 node.streaming["netflix"]' },
  { name: 'node.sponsor', type: 'string', desc: '赞助商文本' },
  { name: 'unlock_flags', type: 'string', desc: '解锁标志汇总字符串' },
  { name: 'filter_mode', type: 'string', desc: '过滤模式（select / mark）' },
]

const sourceFields = [
  { name: 'ID', type: 'string', desc: '来源 UUID' },
  { name: 'Identifier', type: 'string', desc: '标识符' },
  { name: 'Info', type: 'string', desc: '描述信息' },
  { name: 'Status', type: 'string', desc: '状态（active / dead）' },
  { name: 'Type', type: 'string', desc: '来源类型（subscribe / node）' },
]
</script>

<template>
  <div>
    <el-input type="textarea" :model-value="modelValue" :placeholder="placeholder ?? '输入 expr 表达式…'" :rows="3"
      style="font-family: monospace" @input="$emit('update:modelValue', $event as string)" />
    <el-collapse style="margin-top: 4px; border: none">
      <el-collapse-item title="expr-lang 可用字段参考" name="ref">
        <el-table :data="target === 'source' ? sourceFields : target === 'node-name' ? nameFields : nodeFields"
          size="small" style="width: 100%">
          <el-table-column prop="name" label="字段" width="200" />
          <el-table-column prop="type" label="类型" width="130" />
          <el-table-column prop="desc" label="说明" />
        </el-table>
        <div style="margin-top: 8px; font-size: 12px; color: #909399">
          语言教程：<a href="https://expr-lang.org/docs/language-definition" target="_blank"
            rel="noopener">https://expr-lang.org/docs/language-definition</a>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

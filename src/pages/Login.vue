<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({ password: '' })

const rules: FormRules = {
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await authStore.login(form.password)
    router.push('/dashboard')
  } catch (e: any) {
    const msg = e?.response?.data?.error || '密码错误，请重试'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="login-header">
          <span class="login-title">Paily Admin</span>
          <span class="login-sub">管理控制台</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="管理密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入管理密码"
            show-password
            size="large"
            autofocus
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            style="width: 100%"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}

.login-card {
  width: 380px;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.login-title {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
}

.login-sub {
  font-size: 13px;
  color: #909399;
}
</style>


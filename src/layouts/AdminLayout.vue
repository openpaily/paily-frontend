<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import QuickOpenDrawer from '../components/QuickOpenDrawer.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)

function logout() {
  authStore.logout()
  router.push('/login')
}

const menuItems = [
  { path: '/dashboard', title: '仪表盘', icon: 'Odometer' },
  { path: '/nodes', title: '节点管理', icon: 'Connection' },
  { path: '/sources', title: '来源管理', icon: 'Link' },
  { path: '/sponsors', title: '赞助商管理', icon: 'Star' },
  { path: '/filter', title: '过滤测试台', icon: 'Filter' },
  { path: '/config', title: '运行时配置', icon: 'Setting' },
  { path: '/format-configs', title: '格式配置', icon: 'Document' },
  { path: '/logs', title: '日志', icon: 'List' },
]
</script>

<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '200px'" style="background: #001529; transition: width 0.2s; overflow: hidden">
      <div
        style="height: 60px; display: flex; align-items: center; justify-content: center; overflow: hidden; white-space: nowrap"
      >
        <span v-if="!collapsed" style="color: #fff; font-size: 18px; font-weight: bold">Paily Admin</span>
        <el-icon v-else style="color: #fff; font-size: 20px"><Management /></el-icon>
      </div>
      <el-menu
        :default-active="route.path"
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#ffffff"
        :collapse="collapsed"
        :collapse-transition="false"
        router
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e8e8e8; padding: 0 16px">
        <el-button
          :icon="collapsed ? 'Expand' : 'Fold'"
          circle
          size="small"
          @click="collapsed = !collapsed"
        />
        <QuickOpenDrawer />
        <el-button type="danger" plain size="small" @click="logout">退出登录</el-button>
      </el-header>

      <el-main style="overflow-y: auto; position: relative">
        <router-view v-slot="{ Component, route: r }">
          <transition name="page-slide">
            <component :is="Component" :key="r.path" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
/* X-axis cross-fade: both enter and leave animate simultaneously,
   leaving element is taken out of flow with position:absolute to avoid white gap */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-slide-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: var(--el-main-padding, 20px);
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}
</style>

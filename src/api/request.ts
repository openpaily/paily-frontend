import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE as string,
  timeout: 10000,
})

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const authStore = useAuthStore()
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }
  return config
})

request.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        const authStore = useAuthStore()
        await authStore.refreshAccessToken()
        error.config.headers.Authorization = `Bearer ${useAuthStore().accessToken}`
        return request(error.config)
      } catch {
        const authStore = useAuthStore()
        authStore.logout()
        return Promise.reject(error)
      }
    }
    const { ElMessage } = await import('element-plus')
    const msg = error.response?.data?.error || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default request

import { defineStore } from 'pinia'

const SERVICE_SECRET_KEY = 'paily_service_secret'

export const useSettingsStore = defineStore('settings', {
  state: (): { serviceSecret: string } => ({
    serviceSecret: localStorage.getItem(SERVICE_SECRET_KEY) || '',
  }),

  actions: {
    setServiceSecret(secret: string): void {
      this.serviceSecret = secret
      localStorage.setItem(SERVICE_SECRET_KEY, secret)
    },
  },
})

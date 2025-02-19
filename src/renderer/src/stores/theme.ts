import { defineStore } from 'pinia'
export const useThemeStore = defineStore('theme', {
    state: () => ({
        theme: 'dark',
        isDark: true,
        isOpenList: true,
        isOpenSetting: false,
        fontWeight: 700,
        opacity: 1,
        bottom: 0,
        left: 50,
        fontSize: 22,
        letterSpacing: 0,
        color: '',
    }),
    getters: {
    },
    actions: {
    },
    persist: true
})
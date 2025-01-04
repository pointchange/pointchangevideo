import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
    state: () => ({
        theme: 'dark'
    }),
    actions: {
        init() {
            this.changeTheme(this.theme);
        },
        changeTheme(v: string) {
            if (v === 'dark') {
                document.documentElement.setAttribute('data-theme', v);
                window.electron.ipcRenderer.send('dark-mode:toggle', v);
            }
            if (v === 'light') {
                document.documentElement.setAttribute('data-theme', v);
                window.electron.ipcRenderer.send('dark-mode:toggle', v);
            }
        }
    }
})
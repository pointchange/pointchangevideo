import { createPinia } from 'pinia'
import { createApp } from 'vue'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
// Vuetify
// import '@mdi/font/css/materialdesignicons.css'
// import 'vuetify/styles'
// import { createVuetify } from 'vuetify'
// import * as components from 'vuetify/components'
// import * as directives from 'vuetify/directives'
// import { aliases, mdi } from 'vuetify/iconsets/mdi'
import './assets/main.css'
import App from './App.vue'

// const vuetify = createVuetify({
//     icons: {
//         defaultSet: 'mdi',
//         aliases,
//         sets: {
//             mdi,
//         },
//     },
//     components,
//     directives,
// }).use(vuetify)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
createApp(App).use(pinia).mount('#app')

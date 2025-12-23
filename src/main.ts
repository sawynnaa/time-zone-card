import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import { setupI18n } from './i18n'
import './styles/reset.css'
import 'virtual:uno.css'

const app = createApp(App)

// Setup Pinia with persistence plugin
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const i18n = setupI18n()

app.use(pinia) // Install Pinia before i18n
app.use(i18n)
app.mount('#app')

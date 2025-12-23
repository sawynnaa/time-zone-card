import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './i18n'
import './styles/reset.css'
import 'virtual:uno.css'

const app = createApp(App)
const i18n = setupI18n()

app.use(i18n)
app.mount('#app')

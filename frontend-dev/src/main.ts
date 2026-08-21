import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router, { applyTitle } from './router'
import { t, locale } from './i18n'
import './styles/index.css'

const app = createApp(App)
app.config.globalProperties.t = t
app.use(createPinia())
app.use(router)
app.mount('#app')

/* 语言切换时同步浏览器标签标题 */
watch(locale, () => applyTitle(router.currentRoute.value))

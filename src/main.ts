import { createApp } from "vue";
import { pinia } from "./stores";
import App from "./App.vue";
import "./styles/_animations.scss"

const app = createApp(App)

app.use(pinia)
app.mount("#app")
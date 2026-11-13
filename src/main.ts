import { createApp } from "vue";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "@material/web/button/filled-button.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/text-button.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/iconbutton/filled-icon-button.js";
import "@material/web/ripple/ripple.js";
import "@material/web/focus/md-focus-ring.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import { MdDialog } from "@material/web/dialog/dialog.js";
import { MdMenu } from "@material/web/menu/menu.js";
import "@material/web/switch/switch.js";
import "@material/web/slider/slider.js";
import { MdOutlinedTextField } from "@material/web/textfield/outlined-text-field.js";
import "@material/web/progress/circular-progress.js";
import App from "./App.vue";
import "./styles.css";
import "./scrollbars.css";
import scrollbarStyles from "./scrollbars.css?inline";

// Share the same scrollbar rules with Material's scrolling shadow roots.
const scrollbarSheet = new CSSStyleSheet();
scrollbarSheet.replaceSync(scrollbarStyles);
for (const component of [MdDialog, MdMenu, MdOutlinedTextField]) {
  component.elementStyles = [...component.elementStyles, scrollbarSheet];
}

createApp(App).mount("#app");

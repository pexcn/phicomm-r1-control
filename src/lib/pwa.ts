import { reactive } from "vue";

interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const standalone = window.matchMedia("(display-mode: standalone)");
export const pwa = reactive({
  supported: import.meta.env.PROD && window.isSecureContext && "serviceWorker" in navigator,
  installed: standalone.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone,
  canInstall: false,
  offlineReady: false,
  updateAvailable: false,
  checking: false,
  installing: false,
  message: "",
});
let installPrompt: InstallPrompt | null = null;
let registration: ServiceWorkerRegistration | undefined;
let reloadForUpdate = false;
let initialized = false;

function syncWaiting() {
  pwa.updateAvailable = !!registration?.waiting;
}
function observe(worker: ServiceWorker | null) {
  if (!worker) return;
  const changed = () => {
    if (worker.state === "activated") pwa.offlineReady = true;
    if (worker.state === "installed") setTimeout(syncWaiting, 0);
    if (worker.state === "redundant") {
      pwa.message = "离线资源更新未完成，可联网后重试。";
      syncWaiting();
    }
  };
  worker.addEventListener("statechange", changed);
  changed();
}

export async function initPwa() {
  if (initialized || !pwa.supported) return;
  initialized = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPrompt;
    pwa.canInstall = true;
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    pwa.canInstall = false;
    pwa.installed = true;
    pwa.message = "应用已安装。";
  });
  standalone.addEventListener("change", () => {
    pwa.installed = standalone.matches;
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    pwa.offlineReady = true;
    syncWaiting();
    if (reloadForUpdate) {
      reloadForUpdate = false;
      window.location.reload();
    }
  });
  try {
    const base = new URL(import.meta.env.BASE_URL, document.baseURI);
    registration = await navigator.serviceWorker.register(new URL("service-worker.js", base), {
      scope: base.pathname,
      updateViaCache: "none",
    });
    pwa.offlineReady = !!registration.active;
    syncWaiting();
    observe(registration.installing);
    registration.addEventListener("updatefound", () => observe(registration!.installing));
  } catch {
    pwa.message = "暂时无法准备离线资源，请联网后重新打开页面。";
  }
}

export async function installPwa() {
  if (!installPrompt || pwa.installing) return;
  const prompt = installPrompt;
  installPrompt = null;
  pwa.canInstall = false;
  pwa.installing = true;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    pwa.message =
      choice.outcome === "accepted"
        ? "已接受安装，请按浏览器提示完成。"
        : "已取消安装，仍可继续使用网页。";
  } catch {
    pwa.message = "请使用浏览器菜单中的安装应用或添加到主屏幕。";
  } finally {
    pwa.installing = false;
  }
}

export async function checkPwaUpdate() {
  if (!registration || pwa.checking) return;
  pwa.checking = true;
  pwa.message = "";
  try {
    await registration.update();
    syncWaiting();
    pwa.message = "已检查更新；如有新版本，资源下载完成后会提示。";
  } catch {
    pwa.message = "暂时无法检查更新，请确认网络连接后重试。";
  } finally {
    pwa.checking = false;
  }
}

export function applyPwaUpdate() {
  if (!registration?.waiting || reloadForUpdate) return;
  reloadForUpdate = true;
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

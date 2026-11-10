if (!window.control_host) {
  window.control_host = new URL(R1Config.assetBaseUrl).host;
}
const WEB_VERSION = 2863;
const DOWNLOAD_BASE_URL = "https://xfdown.lanzouq.com/";
const LATEST_APP_VERSION = 128;
const LATEST_ECHO_VERSION = 1887;
const LATEST_UNISOUND_VERSION = 1856;
const APP_DOWNLOAD_ID = "iLWWO3349cah";
const ECHO_DOWNLOAD_ID = "iebgs4f8tcxc";
const UNISOUND_DOWNLOAD_ID = "iUCPE34zde2h";

// 兼容固件和原控制界面读取的旧全局字段。
Object.assign(window, {
  web_ver: WEB_VERSION,
  downurl: DOWNLOAD_BASE_URL,
  new_app_ver: LATEST_APP_VERSION,
  new_echo_ver: LATEST_ECHO_VERSION,
  new_unisound_ver: LATEST_UNISOUND_VERSION,
  app_downid: APP_DOWNLOAD_ID,
  echo_downid: ECHO_DOWNLOAD_ID,
  unisound_downid: UNISOUND_DOWNLOAD_ID,
});

if (localStorage.getItem("web_ver") && localStorage.getItem("web_ver") != WEB_VERSION) {
  localStorage.setItem("web_ver", WEB_VERSION);
  var time = new Date().getTime();
  setCookie("time", time, 86400);
  document.getElementsByTagName("h3")[0].innerHTML = "数据更新。。。";
  setTimeout(function () {
    location.reload();
  }, 500);
} else {
  if (!localStorage.getItem("web_ver")) {
    localStorage.setItem("web_ver", WEB_VERSION);
  }
  var script = document.createElement("script");
  script.type = "text/javascript";
  var time = getCookie("time");
  if (time == "") {
    time = new Date().getTime();
    setCookie("time", time, 86400);
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = R1Config.assetUrl("assets/css/classic.css?t=" + time);
  document.head.appendChild(link);
  script.src = R1Config.assetUrl("assets/js/classic/controller.js?t=" + time);
  document.body.appendChild(script);
}

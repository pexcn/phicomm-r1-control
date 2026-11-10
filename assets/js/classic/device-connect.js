function init() {
  const head = document.getElementsByTagName("head")[0];
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = R1Config.assetUrl("assets/css/entry.css");
  head.appendChild(style);
  document.body.classList.add("body");

  var tempDiv = document.createElement("div");
  tempDiv.id = "temp_div";
  tempDiv.style =
    "position: fixed; text-align: center; left: 0px; top: 0px; width: 100%; height: 100%;";
  document.body.appendChild(tempDiv);

  var h3 = document.createElement("h3");
  h3.innerHTML = "页面加载中。";
  tempDiv.appendChild(h3);

  var button = document.createElement("input");
  button.type = "button";
  button.classList.add("reload_btn");
  button.value = "刷新页面";
  button.onclick = function () {
    time = new Date().getTime();
    setCookie("time", time, 604800);
    location.reload();
  };
  tempDiv.appendChild(button);

  var script = document.getElementById("refresh") || document.createElement("script");
  if (script.id !== "refresh") {
    script.type = "text/javascript";
    script.id = "refresh";
    document.body.appendChild(script);
  }
  script.onerror = function () {
    h3.textContent = "页面资源加载失败，请检查本站资源或刷新重试。";
  };
  script.src = R1Config.assetUrl("assets/js/classic/bootstrap.js?t=" + Date.now());
}

function setCookie(cname, cvalue, exdays) {
  var date = new Date();
  date.setTime(date.getTime() + exdays * 1000);
  var expires = "expires=" + date.toGMTString();
  document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(";");
  for (var index = 0; index < ca.length; index++) {
    var text = ca[index].trim();
    if (text.indexOf(name) == 0) return text.substring(name.length, text.length);
  }
  return "";
}

if (window.R1Config) {
  init();
} else {
  var configScript = document.createElement("script");
  configScript.src = new URL("../shared/config.js", document.currentScript.src).href;
  configScript.onload = init;
  document.head.appendChild(configScript);
}

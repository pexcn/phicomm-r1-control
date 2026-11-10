function init() {
  const head = document.getElementsByTagName("head")[0];
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = R1Config.assetUrl("assets/css/entry.css");
  head.appendChild(style);
  document.body.classList.add("body");

  var temp_div = document.createElement("div");
  temp_div.id = "temp_div";
  temp_div.style =
    "position: fixed; text-align: center; left: 0px; top: 0px; width: 100%; height: 100%;";
  document.body.appendChild(temp_div);

  var h3 = document.createElement("h3");
  h3.innerHTML = "页面加载中。";
  temp_div.appendChild(h3);

  var btn = document.createElement("input");
  btn.type = "button";
  btn.classList.add("reload_btn");
  btn.value = "刷新页面";
  btn.onclick = function () {
    time = new Date().getTime();
    setCookie("time", time, 604800);
    location.reload();
  };
  temp_div.appendChild(btn);

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
  var d = new Date();
  d.setTime(d.getTime() + exdays * 1000);
  var expires = "expires=" + d.toGMTString();
  document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
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

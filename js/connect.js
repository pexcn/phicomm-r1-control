function init() {
  const head = document.getElementsByTagName("head")[0];
  const style = document.createElement("style");
  const rules = document.createTextNode(`
html {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.body {
  background: linear-gradient(145deg, #4c7ec3, #9ac4e8, #4a8ec7);
  background-repeat: no-repeat;
  background-position: center center;
  background-attachment: fixed;
  background-size: cover;
}

a {
  color: white;
}

h3 {
  text-align: center;
  color: white;
}

.reload_btn {
  margin: 15px 0px 15px 0px;
  width: 100px;
  height: 50px;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(4px);
  border: none;
  box-shadow: 0 8px 10px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
}

.reload_btn:active {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(3px);
}`);
  if (style.styleSheet) {
    style.styleSheet.cssText = rules.nodeValue;
  } else {
    style.appendChild(rules);
  }
  head.appendChild(style);
  document.body.classList.add("body");


  var temp_div = document.createElement("div");
  temp_div.id = "temp_div";
  temp_div.style = "position: fixed; text-align: center; left: 0px; top: 0px; width: 100%; height: 100%;";
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
  script.onload = () => {
    var Storage = localStorage;
    Storage.setItem("refresh.js", script.src);
  };
  script.onerror = () => {
    var Storage = localStorage;
    if (Storage.getItem("refresh.js")) {
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.src = Storage.getItem("refresh.js");
      document.body.appendChild(script);
    }
  };
  script.src = R1Config.assetUrl("refresh.js?t=" + Date.now());
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 1000));
  var expires = "expires=" + d.toGMTString();
  document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
  }
  return "";
}

if (window.R1Config) {
  init();
} else {
  var configScript = document.createElement('script');
  configScript.src = new URL('./config.js', document.currentScript.src).href;
  configScript.onload = init;
  document.head.appendChild(configScript);
}

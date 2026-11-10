window.subTitle = "R1音箱控制页面";
if (!!window.ActiveXObject || "ActiveXObject" in window) {
  alert("抱歉，本页面不支持IE内核！");
}

window.addEventListener("load", function () {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(function (error) {
      console.warn("Service Worker 注册失败", error);
    });
  }
});

var Storage = localStorage;
loadScripts();

var control_host = location.host;
var custom_ip = true;
var ip = "";
function loadScripts() {
  if (!window._loadjs) {
    window._loadjs = true;
  } else {
    return;
  }

  var tempDiv = document.createElement("div");
  tempDiv.id = "temp_div";
  tempDiv.style = "text-align:center;";
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

  var params = location.href.substr(location.href.indexOf("?") + 1).split("&");
  for (var index = 0; index < params.length; index++) {
    var param = params[index].split("=");
    if (param[0] == "ip") {
      ip = param[1];
      if (ip.split(":").length < 2) {
        ip += ":8080";
      }
      custom_ip = false;
    }
  }

  var script = document.getElementById("refresh");
  script.onerror = function () {
    h3.textContent = "页面资源加载失败，请检查本站资源或刷新重试。";
  };
  script.src = R1Config.assetUrl("assets/js/classic/bootstrap.js?t=" + Date.now());
}

function isWechatOrQQ() {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("micromessenger") || /\sqq\//.test(ua) || ua.includes("v1_and_sq_");
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

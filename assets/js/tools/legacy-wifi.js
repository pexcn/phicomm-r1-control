var config_wifi_asset_base = new URL("../../../", document.currentScript.src);
document.body.style = "background-color:#A9D0F5;";
var link = document.createElement("link");
link.rel = "stylesheet";
link.href = new URL("assets/css/classic.css", config_wifi_asset_base).href;
document.getElementsByTagName("head")[0].appendChild(link);

var script = document.createElement("script");
script.onerror = function () {
  this.onerror = null;
  var fallback = document.createElement("script");
  fallback.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js";
  document.head.appendChild(fallback);
};
script.type = "text/javascript";
script.src = new URL("assets/vendor/jquery/jquery-3.6.0.min.js", config_wifi_asset_base).href;
document.head.appendChild(script);

var config_wifi_div = document.createElement("div");
config_wifi_div.style = "text-align:center;";

var h3 = document.createElement("h3");
h3.style.color = "rgba(238, 0, 0, 1)";
h3.innerHTML = "R1音箱配网页面";
config_wifi_div.appendChild(h3);
window.StatusBar_div = document.createElement("div");
document.body.appendChild(StatusBar_div);
document.body.appendChild(config_wifi_div);

window.config_wifi_btn = null;
window.timer = -1;
load();

document.addEventListener("plusready", function () {
  if (typeof window.plus != "undefined") {
    if (plus.navigator.isImmersedStatusbar()) {
      StatusBar_div.style.height = parseInt(plus.navigator.getStatusbarHeight() / 2) + 5 + "px";
    }
  }
});

function load() {
  window.tips = document.createElement("text");
  tips.id = "text";
  tips.style =
    "display:block; text-align:left; margin:10px auto; width:70%; height:200px; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(0,160,255,1); border-radius:15px; overflow-x:hidden; overflow-y:auto;";
  tips.innerHTML = "<text>配网步骤：</text><br>";
  tips.innerHTML +=
    "<text>1.长按音箱顶部按键5秒，音箱提示 开始网络配置（且底部白色灯光闪烁）。</text><br>";
  tips.innerHTML += "<text>2.将本机连接到R1的WIFI热点（Phicomm_R1_XXXX）。</text><br>";
  tips.innerHTML += "<text>3.返回本页面输入你要连接的WIFI和密码，并点击开始配网。</text><br>";
  tips.innerHTML += "<text>请使用手机打开本页面进行配网！</text><br>";
  window.iframe = document.createElement("iframe");
  iframe.style =
    "display:block; text-align:left; margin:10px auto; width:70%; height:100px; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(0,160,255,1); border-radius:15px; overflow-x:hidden; overflow-y:auto;";
  setInterval(() => {
    iframe.src = `http://192.168.43.1:8989/api/wifilist?` + Date.now();
  }, 2000);

  var text = document.createElement("text");
  text.innerHTML = "提示：";
  config_wifi_div.appendChild(text);
  config_wifi_div.appendChild(document.createElement("div"));
  config_wifi_div.appendChild(tips);
  config_wifi_div.appendChild(document.createElement("div"));

  var text = document.createElement("text");
  text.innerHTML = "检查：";
  config_wifi_div.appendChild(text);
  config_wifi_div.appendChild(iframe);
  config_wifi_div.appendChild(document.createElement("div"));

  var text = document.createElement("text");
  text.innerHTML = "输入：";
  config_wifi_div.appendChild(text);
  config_wifi_div.appendChild(document.createElement("div"));

  var text = document.createElement("text");
  text.innerHTML = "WIFI：";
  config_wifi_div.appendChild(text);
  var ssid = document.createElement("input");
  ssid.type = "text";
  ssid.id = "ssid";
  ssid.className = "input";
  ssid.style.width = "65%";
  ssid.value = sessionStorage.getItem("ssid");
  config_wifi_div.appendChild(ssid);

  config_wifi_div.appendChild(document.createElement("div"));

  var text = document.createElement("text");
  text.innerHTML = "加密：";
  config_wifi_div.appendChild(text);
  var encryption = document.createElement("select");
  encryption.id = "encryption";
  encryption.className = "input";
  encryption.value = sessionStorage.getItem("secure");
  encryption.style.width = "65%";

  var encryptions = [
    ["无加密", "INSECURE"],
    ["WEP加密", "WEP"],
    ["WPA加密", "WPA"],
  ];

  for (var i = 0; i < encryptions.length; i++) {
    var option = document.createElement("option");
    option.innerHTML = encryptions[i][0];
    option.value = encryptions[i][1];
    encryption.appendChild(option);
  }

  encryption[encryptions.length - 1].selected = true;

  for (var i in encryptions) {
    if (encryptions[i][1] == sessionStorage.getItem("secure")) {
      encryption[i].selected = true;
    }
  }

  config_wifi_div.appendChild(encryption);

  config_wifi_div.appendChild(document.createElement("div"));

  var text = document.createElement("text");
  text.innerHTML = "密码：";
  config_wifi_div.appendChild(text);
  var password = document.createElement("input");
  password.type = "text";
  password.id = "password";
  password.className = "input";
  password.style.width = "65%";
  password.value = sessionStorage.getItem("password");
  config_wifi_div.appendChild(password);

  config_wifi_div.appendChild(document.createElement("div"));

  var btn = document.createElement("input");
  btn.type = "button";
  btn.className = "btn";
  btn.value = "开始配网";
  btn.id = "config_wifi_btn";
  btn.onclick = function () {
    this.disabled = true;
    this.value = "正在发送配网信息。。。";
    var data = {
      ssid: ssid.value,
      secure: encryption.value,
      password: password.value,
      mac: "",
    };

    sessionStorage.setItem("ssid", ssid.value);
    sessionStorage.setItem("secure", encryption.value);
    sessionStorage.setItem("password", password.value);
    if (window.plus) {
      window.xhttp = new plus.net.XMLHttpRequest();
    } else {
      window.xhttp = new XMLHttpRequest();
    }
    xhttp.open("post", "http://192.168.43.1:8989/api/configwifi");
    xhttp.onreadystatechange = () => {
      if (window.timer != -1 && xhttp.readyState == 4) {
        clearTimeout(window.timer);
        window.timer = -1;
        const ret = xhttp.responseText || "";
        config_wifi_btn.value = "已发送配网信息，请自行检查是否配网成功！";
        alert(config_wifi_btn.value + "\n" + ret);
        setTimeout(function () {
          config_wifi_btn.disabled = false;
          config_wifi_btn.value = "开始配网";
        }, 1000);
      }
    };
    window.timer = setTimeout(function () {
      window.timer = -1;
      xhttp.onreadystatechange = () => {};
      config_wifi_btn.value = "配网超时，请检查是否已连接R1热点且已关闭手机数据连接！";
      alert(config_wifi_btn.value);
      setTimeout(function () {
        config_wifi_btn.disabled = false;
        config_wifi_btn.value = "开始配网";
      }, 1000);
      location.reload();
    }, 3000);
    xhttp.send(JSON.stringify(data));
    //$.ajax({type:'POST',url:'http://192.168.43.1:8989/api/configwifi',dataType:'json',data:JSON.stringify(data),success:success,error:error});
  };
  window.config_wifi_btn = btn;
  config_wifi_div.appendChild(btn);

  config_wifi_div.appendChild(document.createElement("br"));

  var btn = document.createElement("input");
  btn.type = "button";
  btn.className = "btn";
  btn.value = "返回首页";
  btn.onclick = function () {
    location.href = new URL("?no_auto_connect", config_wifi_asset_base).href;
  };
  config_wifi_div.appendChild(btn);
}

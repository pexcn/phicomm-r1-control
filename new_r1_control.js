var r1_loader_base = new URL('./', document.currentScript.src).href;
if (!control_host) {
	var control_host = new URL(r1_loader_base).host;
}
if (!ver) {
	var ver = 1000;
}
if (!u_ver) {
	var u_ver = 1000;
}
var time = new Date().getTime();
var head = "<meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1,user-scalable=0,maximum-scale=1,viewport-fit=cover'><meta name='format-detection' content='telephone=no'><meta name='renderer' content='webkit'/><meta name='force-rendering' content='webkit'/><meta http-equiv='X-UA-Compatible' content='IE=Edge,chrome=1'/><title>R1音箱控制页面</title><link rel='stylesheet' href='" + new URL("new_r1_control.css?t=" + time, r1_loader_base).href + "'/><link rel='icon' type='image/png' href='" + new URL("icon.png", r1_loader_base).href + "'/><link rel='icon' type='image/svg+xml' href='" + new URL("favicon.svg", r1_loader_base).href + "'/><meta name='apple-mobile-web-app-capable' content='yes'><meta name='apple-touch-fullscreen' content='yes'><meta name='apple-mobile-web-app-status-bar-style' content='black'><meta name='full-screen' content='yes'><meta name='browsermode' content='application'><meta name='x5-fullscreen' content='true'><meta name='x5-page-mode' content='app'><meta name='keywords' content='R1,斐讯R1,R1音箱,R1音箱控制,R1音箱控制页面'>";
document.getElementsByTagName("head")[0].innerHTML = head;

var reg_ip = /^(127\.0\.0\.1)|(localhost)|(10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(172\.((1[6-9])|(2\d)|(3[01]))\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})/;
if (location.host.indexOf(control_host) == -1 && (reg_ip.test(location.host) || /phicomm_r1_\S+/u.test(location.host.toLowerCase())) && location.href.indexOf('no_jump') == -1) {
	location.href = r1_loader_base + '?connect_ip=' + encodeURIComponent(location.host) + '&ver=' + ver + '&u_ver=' + u_ver;
} else {
	var custom_ip = false;
	var ip = location.host;
	var script = document.createElement('script'); script.type = 'text/javascript';
	script.src = new URL('js/connect.js?t=' + Date.now(), r1_loader_base).href;
	document.body.appendChild(script);
}
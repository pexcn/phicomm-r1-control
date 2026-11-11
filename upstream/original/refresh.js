if (!window.control_host) {
	window.control_host = 'r1.wxfsq.com';
}
const web_ver = 2863;
const downurl = 'https://xfdown.lanzouq.com/';
const new_app_ver = 128;
const new_echo_ver = 1887;
const new_unisound_ver = 1856;
const app_downid = 'iLWWO3349cah';
const echo_downid = "iebgs4f8tcxc";
const unisound_downid = 'iUCPE34zde2h';


if (localStorage.getItem('web_ver') && localStorage.getItem('web_ver') != web_ver) {
	localStorage.setItem('web_ver', web_ver);
	var time = new Date().getTime();
	setCookie('time', time, 86400);
	document.getElementsByTagName("h3")[0].innerHTML = '数据更新。。。';
	setTimeout(function () {
		location.reload();
	}, 500);
} else {
	if (!localStorage.getItem('web_ver')) {
		localStorage.setItem('web_ver', web_ver);
	}
	var script = document.createElement('script'); script.type = 'text/javascript';
	var time = getCookie('time');
	if (time == '') {
		time = new Date().getTime();
		setCookie('time', time, 86400);
	}
	const link = document.createElement('link'); link.rel = 'stylesheet'; link.type = 'text/css';
	link.href = location.protocol + "//" + control_host + "/new_r1_control.css?t=" + time;
	document.head.appendChild(link);
	script.src = location.protocol + '//' + control_host + '/js/r1_control.min.js?t=' + time;
	document.body.appendChild(script);
}
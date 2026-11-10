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
      loadjs();

      var control_host = location.host;
      var custom_ip = true;
      var ip = "";
      function loadjs() {
        if (!window._loadjs) {
          window._loadjs = true;
        } else {
          return;
        }

        var temp_div = document.createElement("div");
        temp_div.id = "temp_div";
        temp_div.style = "text-align:center;";
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

        var params = location.href
          .substr(location.href.indexOf("?") + 1)
          .split("&");
        for (var i = 0; i < params.length; i++) {
          var param = params[i].split("=");
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
          h3.textContent = '页面资源加载失败，请检查本站资源或刷新重试。';
        };
        script.src = R1Config.assetUrl("assets/js/classic/bootstrap.js?t=" + Date.now());
      }

      function isWechatOrQQ() {
        const ua = navigator.userAgent.toLowerCase();
        return (
          ua.includes("micromessenger") ||
          /\sqq\//.test(ua) ||
          ua.includes("v1_and_sq_")
        );
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

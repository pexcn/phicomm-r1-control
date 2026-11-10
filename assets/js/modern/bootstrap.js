/* 依赖顺序：React → 组件库 → 核心层 → 页面 → 应用外壳 */
window.__loadReact(0, function () {
  var files = [
    "../../assets/js/modern/components.js?v=6",
    "../../assets/js/modern/store.js?v=6",
    "../../assets/js/modern/music-panel.js?v=19",
    "../../assets/js/modern/device-panel.js?v=13",
    "../../assets/js/modern/app.js?v=8",
  ];
  var failed = [];
  /* 自诊断：脚本加载失败时，把浏览器实际请求的完整 URL、HTTP 状态、Content-Type 显示出来，
   * 区分三种服务器问题：文件没传上去(404) / 访问路径解析错(URL 不对) / MIME 配置拦截(200 但拒绝执行) */
  function renderDiag(full, hint) {
    document.getElementById("root").innerHTML =
      '<div style="padding:28px;font-family:sans-serif;line-height:1.9;max-width:720px">' +
      '<div style="color:#ff8f88;font-size:17px;font-weight:600">核心脚本加载失败</div>' +
      '<div style="margin-top:10px;color:#999;font-size:13px;word-break:break-all">失败文件：' +
      failed.join("、") +
      "</div>" +
      '<div style="margin-top:6px;color:#999;font-size:13px;word-break:break-all">实际请求：' +
      full +
      "</div>" +
      '<div style="margin-top:12px;color:#e0a060;font-size:14px">' +
      hint +
      "</div>" +
      "</div>";
  }
  function diagnose(file) {
    var full;
    try {
      full = new URL(file, window.location.href).href;
    } catch (e) {
      full = file;
    }
    fetch(full, { cache: "no-store" })
      .then(function (r) {
        var ct = r.headers.get("content-type") || "未知";
        var hint;
        if (r.status === 404) {
          hint =
            "服务器上没有这个文件（HTTP 404）：请把整个 js/ 目录完整上传到服务器（文件名大小写要完全一致），并确认上传路径与访问路径对应。";
        } else if (!r.ok) {
          hint =
            "服务器拒绝访问（HTTP " +
            r.status +
            "）：请检查服务器对该目录/文件的读取权限或安全软件拦截。";
        } else if (/javascript|ecmascript/.test(ct)) {
          hint =
            "服务器返回正常，但脚本没执行：多半是浏览器缓存了旧版，请强制刷新（Ctrl+F5，手机端清缓存）后重试。";
        } else {
          hint =
            "服务器把 .js 返回成了「" +
            ct +
            "」，浏览器因此拒绝执行：请在服务器 MIME/类型配置中为 .js 添加 text/javascript（常见于 nginx/apache/IIS 未配 MIME，或某些网盘/建站面板）。";
        }
        renderDiag(full, hint);
      })
      .catch(function () {
        renderDiag(
          full,
          "网络请求失败：请确认访问地址正确——如果网页放在服务器子目录，URL 结尾要带 /（如 http://服务器地址/web/），否则 js/ 路径会解析到错误位置。",
        );
      });
  }
  (function load(i) {
    if (i >= files.length) {
      if (failed.length) console.warn("加载失败的可选模块：", failed);
      return;
    }
    var s = document.createElement("script");
    s.src = files[i];
    /* 单个模块失败不阻断后续模块：外壳缺失的页面会显示占位提示 */
    s.onload = function () {
      load(i + 1);
    };
    s.onerror = function () {
      failed.push(files[i]);
      if (files[i].indexOf("app.js") >= 0) {
        diagnose(files[i]);
        return;
      }
      load(i + 1);
    };
    document.head.appendChild(s);
  })(0);
});

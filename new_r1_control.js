/* 兼容 EchoService 的固定入口，加载保留的原作者实现。 */
(function () {
  var deploymentBase = new URL("./", document.currentScript.src);
  var loaderScript = document.createElement("script");
  loaderScript.src = new URL("upstream/new_r1_control.js", deploymentBase).href;
  document.head.appendChild(loaderScript);
})();

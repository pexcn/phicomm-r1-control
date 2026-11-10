/* 兼容 EchoService 的固定入口；实际实现位于 assets/js/classic/。 */
(function () {
  var deploymentBase = new URL("./", document.currentScript.src);
  var loaderScript = document.createElement("script");
  loaderScript.src = new URL("assets/js/classic/device-loader.js", deploymentBase).href;
  document.head.appendChild(loaderScript);
})();

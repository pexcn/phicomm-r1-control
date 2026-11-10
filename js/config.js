/* 自部署配置；可在加载此文件前通过 window.R1Config 覆盖默认值。 */
(function () {
  var supplied = window.R1Config || {};
  var base = new URL('../', document.currentScript.src).href;
  var config = Object.assign({
    assetBaseUrl: base,
    musicApiUrl: 'https://r1.wxfsq.com/music',
    serviceBaseUrl: base,
    scanProxyBaseUrl: '',
    analyticsId: ''
  }, supplied);
  config.assetUrl = function (path) {
    return new URL(path, config.assetBaseUrl).href;
  };
  config.serviceUrl = function (path) {
    return new URL(path, config.serviceBaseUrl).href;
  };
  window.R1Config = config;
})();

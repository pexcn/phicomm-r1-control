/* 自部署配置；可在加载此文件前通过 window.R1Config 覆盖默认值。 */
(function () {
  var supplied = window.R1Config || {};
  var base = new URL('../../../', document.currentScript.src).href;
  var config = Object.assign({
    assetBaseUrl: base,
    musicApiUrl: 'https://r1.wxfsq.com/music',
    serviceBaseUrl: base,
    scanProxyBaseUrl: ''
  }, supplied);
  config.assetUrl = function (path) {
    return new URL(path, config.assetBaseUrl).href;
  };
  config.serviceUrl = function (path) {
    return new URL(path, config.serviceBaseUrl).href;
  };
  // 普通设备地址默认使用 8080；代理地址保留协议、端口、路径和查询参数。
  config.parseDeviceAddress = function (value) {
    var input = String(value || '').trim();
    var invalid = new Error('请输入正确的IP、主机名或 WebSocket 地址。');
    if (!input || /[\s#\\]/.test(input)) throw invalid;
    var explicit = /^wss?:\/\//i.test(input);
    if (!explicit && /^[a-z][a-z\d+.-]*:\/\//i.test(input)) throw invalid;
    var proxy = explicit || input.indexOf('/') !== -1;
    if (!proxy && input.indexOf('?') !== -1) throw invalid;
    var address = input;
    if (!proxy && !/:\d+$/.test(address)) address += ':8080';
    var url;
    try { url = new URL(explicit ? input : (proxy ? 'wss://' : 'ws://') + address); }
    catch (error) { throw invalid; }
    if (url.username || url.password || !url.hostname) throw invalid;
    var host = url.hostname;
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host) &&
        !/^\[[a-f\d:]+\]$/i.test(host) && host !== 'localhost' &&
        !/^phicomm_r1_[a-z\d_-]+$/i.test(host) &&
        !/^[a-z\d_-]+(?:\.[a-z\d_-]+)+$/i.test(host)) throw invalid;
    // URL 会省略 ws 的默认 80 端口；保存地址时保留它，避免重连改成 8080。
    return { address: proxy ? url.href : url.host + (url.port ? '' : ':80'),
      url: url.href, host: host };
  };
  config.deviceHttpUrl = function (value, path) {
    var endpoint = new URL(config.parseDeviceAddress(value).url.replace(/^ws/, 'http'));
    var url = new URL(path, endpoint);
    url.search = endpoint.search;
    return url.href;
  };
  window.R1Config = config;
})();

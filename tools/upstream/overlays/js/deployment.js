/* 本地部署适配；原作者代码与本地站点分别使用独立的页面和存储。 */
(function () {
  const baseUrl = new URL("../", document.currentScript.src).href;
  const supplied = window.R1Upstream || {};

  function isolatedStorage(storage, prefix) {
    const keys = () => Object.keys(storage).filter((key) => key.startsWith(prefix));
    const methods = {
      getItem: (key) => storage.getItem(prefix + String(key)),
      setItem: (key, value) => storage.setItem(prefix + String(key), String(value)),
      removeItem: (key) => storage.removeItem(prefix + String(key)),
      clear: () => keys().forEach((key) => storage.removeItem(key)),
      key: (index) => (keys()[index] || "").slice(prefix.length) || null,
    };
    return new Proxy(
      {},
      {
        get: (_, key) =>
          key === "length"
            ? keys().length
            : key in methods
              ? methods[key]
              : typeof key === "string"
                ? methods.getItem(key)
                : undefined,
        set: (_, key, value) => {
          methods.setItem(key, value);
          return true;
        },
        deleteProperty: (_, key) => {
          methods.removeItem(key);
          return true;
        },
        ownKeys: () => keys().map((key) => key.slice(prefix.length)),
        getOwnPropertyDescriptor: (_, key) =>
          methods.getItem(key) === null
            ? undefined
            : { configurable: true, enumerable: true, writable: true, value: methods.getItem(key) },
      },
    );
  }

  if (!window.__r1UpstreamStorage) {
    for (const name of ["localStorage", "sessionStorage"]) {
      const storage = isolatedStorage(window[name], "phicomm-r1:upstream:");
      Object.defineProperty(window, name, { configurable: true, value: storage });
    }
    window.__r1UpstreamStorage = true;
  }
  window.R1Upstream = Object.assign(
    {
      baseUrl,
      host: new URL(baseUrl).host,
      musicApiUrl: "https://r1.wxfsq.com/music",
      serviceBaseUrl: new URL("../", baseUrl).href,
    },
    supplied,
  );
  window.R1Upstream.assetUrl = (path) => new URL(path, window.R1Upstream.baseUrl).href;
  window.R1Upstream.serviceUrl = (path) => new URL(path, window.R1Upstream.serviceBaseUrl).href;
})();

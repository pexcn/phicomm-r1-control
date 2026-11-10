(function () {
  var pairs = [
    [
      "../../assets/vendor/react/react.production.min.js",
      "https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js",
    ],
    [
      "../../assets/vendor/react/react-dom.production.min.js",
      "https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js",
    ],
  ];
  window.__loadReact = function (value, next) {
    if (value >= pairs.length) {
      next();
      return;
    }
    var script = document.createElement("script");
    script.src = pairs[value][0];
    script.onerror = function () {
      var script2 = document.createElement("script");
      script2.src = pairs[value][1];
      script2.onload = script2.onerror = function () {
        window.__loadReact(value + 1, next);
      };
      document.head.appendChild(script2);
    };
    script.onload = function () {
      window.__loadReact(value + 1, next);
    };
    document.head.appendChild(script);
  };
})();

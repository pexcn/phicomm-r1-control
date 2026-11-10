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
  window.__loadReact = function (i, next) {
    if (i >= pairs.length) {
      next();
      return;
    }
    var s = document.createElement("script");
    s.src = pairs[i][0];
    s.onerror = function () {
      var c = document.createElement("script");
      c.src = pairs[i][1];
      c.onload = c.onerror = function () {
        window.__loadReact(i + 1, next);
      };
      document.head.appendChild(c);
    };
    s.onload = function () {
      window.__loadReact(i + 1, next);
    };
    document.head.appendChild(s);
  };
})();

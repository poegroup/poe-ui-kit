(function() {
  var c = window.console || function() {};
  c.log = c.log || function(){};
  c.warn = c.warn || function(){};

  if (history.pushState) return;

  // Are we one the vision router?
  if (window.location.hash === "" && window.location.pathname.charAt(1) === "_") return;

  // if hashbang not found then convert link to hashbang mode
  if (window.location.hash.charAt(1) !== "!") {
    var base = window.basePath;
    var pathname = window.location.pathname + '';
    var path = base === '/' ? base : pathname.replace(base, '');
    if (path === '') path = '/';
    if (base.charAt(base.length-1) !== '/') base += '/';
    window.location.replace(base + '#!' + path + window.location.search + window.location.hash);
  }
})();

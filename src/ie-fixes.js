(function() {
  var c = window.console || function() {};
  c.log = c.log || function(){};
  c.warn = c.warn || function(){};

  if (history.pushState) return;
  
  if (!window.HTMLElement) window.HTMLElement = window.Element;

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

(function() {
  var c = window.console || function() {};
  c.log = c.log || function(){};
  c.warn = c.warn || function(){};

  if (history.pushState) return;

  var base = window.basePath;
  // if hashbang url found and we are not on our base then go to base
  if (window.location.hash.charAt(1) === "!" && window.location.pathname !== base) {
    window.location.replace('/#!' + window.location.hash.substring(2));
  }
  // if hashbang not found then convert link to hashbang mode
  if (window.location.hash.charAt(1) !== "!") {
    var path = base === '/' ? base : window.location.pathname.replace(base);
    window.location.replace('/#!' + path + window.location.search + window.location.hash);
  }
})();

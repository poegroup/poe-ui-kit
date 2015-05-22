/**
 * Module dependencies
 */

var stack = require('simple-stack-common');
var envs = require('envs');
var assets = require('simple-assets');
var urlparse = require('url').parse;
var extname = require('path').extname;

/**
 * Forwarding headers
 */

var headers = {
  host: 'x-orig-host',
  path: 'x-orig-path',
  port: 'x-orig-port',
  proto: 'x-orig-proto'
};

/**
 * Create a poe-kit
 */

exports = module.exports = function(opts) {
  opts = opts || {};

  // get the root of the app
  var root = opts.root || process.cwd();

  // create the app
  var app = stack({
    base: headers
  });

  // expose the app root
  app.set('root', root);

  // use jade as the view engine
  app.set('view engine', 'jade');
  app.engine('jade', require('jade').__express);

  // load the package.json for locals
  var pkg = loadPackage(root);

  app.locals({
    app: pkg.name,
    description: pkg.description,
    author: pkg.author,
    env: {
      BROWSER_ENV: envs('NODE_ENV', 'production')
    }
  });

  // expose a way to set browser environment variables
  app.env = function(key, value) {
    app.locals.env[key] = value;
  };

  // serve static assets
  app.useBefore('router', '/build', function build(req, res, next) {
    stack.middleware.static(opts.root + '/build', {
      maxAge: req.get('x-env') === 'production' ? 31557600 : 0
    })(req, res, next);
  });

  // setup the cookie parser
  app.useBefore('router', stack.middleware.cookieParser());

  // set asset paths
  app.useBefore('router', initAssetLocals(opts.cdn || envs('CDN_URL') || ''));

  // set enabled feature flags
  app.useBefore('router', initFeatureFlags(opts.enabledFeatures || envs('ENABLED_FEATURES') || ''));

  // serve a noscript page
  app.get('/noscript', function(req, res) {
    res.cookie('noscript', '1');
    res.render('noscript');
  });

  return app;
};

/**
 * Expose the middleware
 */

exports.middleware = stack.middleware;

/**
 * Load the package.json from root
 *
 * @param {String} root
 * @return {Object}
 */

function loadPackage(root) {
  try {
    return require(root + '/package.json');
  } catch (err) {
    return {};
  };
}

/**
 * Initialize the asset locals middleware
 */

function initAssetLocals(cdn) {
  function lookup(file, base, min) {
    return base + '/' + assets(file, min);
  }

  function styles(min, base) {
    return [
      lookup('build/style.css', base, min)
    ];
  }

  function scripts(min, base) {
    return [
      lookup('build/vendor.js', base, min),
      lookup('build/app.js', base, min)
    ];
  }

  return function assetLocals(req, res, next) {
    var min = req.get('x-env') === 'production';
    var base = urlparse(req.base).pathname;

    if (base === '/') base = '';
    base = (req.get('x-cdn-url') || cdn || '') + base;

    function asset(path, doMin) {
      if (typeof doMin === 'undefined') doMin = min;
      return lookup(path, base, doMin);
    }

    res.locals({
      pretty: min,
      styles: styles(min, base),
      scripts: scripts(min, base),
      requireScript: asset('build/require.js'),
      ieFixesScript: asset('build/ie-fixes.js'),
      loader: asset('build/script.js'),
      noscriptRedirect: !req.cookies.noscript,
      pretty: !min,
      basePath: req.get('x-orig-path') || '/',
      asset: asset
    });
    next();
  };
}

/**
 * Initialize the feature flags middleware
 */

function initFeatureFlags(enabled) {
  return function features(req, res, next) {
    if (req.get('x-env') !== 'production') return next();
    if (enabled && enabled !== req.cookies.features) res.cookie('features', enabled);
    next();
  };
}

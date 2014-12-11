/**
 * Module dependencies
 */

var stack = require('simple-stack-common');
var envs = require('envs');
var urlparse = require('url').parse;
var extname = require('path').extname;
var NODE_ENV = envs('NODE_ENV', 'production');
var DEVELOPMENT = NODE_ENV === 'development';

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
  app.set('views', root + '/src');
  app.engine('jade', require('jade').__express);

  // load the package.json for locals
  var pkg = loadPackage(root);

  app.locals({
    app: pkg.name,
    description: pkg.description,
    author: pkg.author,
    env: {
      BROWSER_ENV: envs('NODE_ENV', 'production'),
      API_URL: '/api'
    }
  });

  // expose a way to set browser environment variables
  app.env = function(key, value) {
    app.locals.env[key] = value;
  };

  // serve static assets
  app.useBefore('router', '/build', 'build-headers', function(req, res, next) {
    var env = req.get('x-env');
    var maxAge = env === 'production' ? 31557600 : 0;
    res.set('cache-control', 'public, max-age=' + maxAge);
    next();
  });
  app.useBefore('router', '/build', 'build', stack.middleware.static(root + '/build'));

  // setup the cookie parser
  app.useBefore('router', stack.middleware.cookieParser());

  // set asset paths
  app.useBefore('router', initAssetLocals(opts.cdn || envs('CDN_URL') || '', root));

  // set enabled feature flags
  app.useBefore('router', initFeatureFlags(opts.enabledFeatures || envs('ENABLED_FEATURES') || ''));

  // serve a noscript page
  app.get('/noscript', function(req, res) {
    res.cookie('noscript', '1');
    res.render('noscript');
  });

  app.builder = require('directiv-core-builder')(app.get('root') + '/src');

  initBuilder(app);

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

function initAssetLocals(cdn, root) {
  var manifests = {
    pretty: null,
    min: null
  };

  function lookup(min, base, file) {
    var type = min ? 'min' : 'pretty';
    var group = manifests[type];
    if (!group) group = manifests[type] = require(root + '/manifest' + (min ? '.min' : '') + '.json');

    if (!file) return Object.keys(group).map(lookup.bind(null, min, base));

    var manifest = group[file];
    if (!manifest) manifest = group[file];
    return cdn + base + '/' + file;
  }

  function scripts(min, base) {
    if (DEVELOPMENT) return [
      base + '/build/main.js'
    ];

    return lookup(min, base);
  }

  return function assetLocals(req, res, next) {
    var min = (req.get('x-env') || NODE_ENV) === 'production';

    var base = urlparse(req.base).pathname;

    if (base === '/') base = '';

    function asset(path, doMin) {
      if (typeof doMin === 'undefined') doMin = min;
      return lookup(doMin, path);
    }

    res.locals({
      cdn: cdn + base + '/build',
      scripts: scripts(min, base + '/build'),
      base: base,
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

function initBuilder(app) {
  if (!DEVELOPMENT) return;

  app.on('ready', function(httpServer) {
    var WebpackDevServer = require('webpack-dev-server');
    var colors = require('colors');
    var socketio = require('webpack-dev-server/node_modules/socket.io');
    var config = app.builder;

    var compiler = config.load();
    var WEBPACK_DEBUG = typeof envs('WEBPACK_DEBUG') !== 'undefined';
    var server = new WebpackDevServer(compiler, {
      contentBase: false,
      publicPath: '',
      hot: true,
      stats: WEBPACK_DEBUG
    });

    app.use('/build', 'webpack', server.app);

    if (!WEBPACK_DEBUG) {
      compiler.plugin('done', function(stats) {
        var warns = stats.compilation.warnings;
        if (warns.length) {
          console.log('====WARNINGS====\n'.yellow);
          warns.forEach(function(warn) {
            console.warn(warn.module.context.yellow + ':\n' + warn.message + '\n');
          })
        }

        var errs = stats.compilation.errors;
        if (errs.length) {
          console.error('====ERRORS====\n'.red);
          errs.forEach(function(err) {
            console.error(err.module.context.red + ':\n' + err.stack || err.message || err);
          });
        }
      });
    }

    server.io = socketio.listen(httpServer, {
      'log level': 1
    });
    server.io.sockets.on('connection', function(socket) {
      if(this.hot) socket.emit('hot');
      if(!this._stats) return;
      this._sendStats(socket, this._stats.toJson());
    }.bind(server));

    process.on('SIGTERM', close);
    process.on('SIGINT', close);
    function close() {
      server.middleware.close();
    }
  });
}

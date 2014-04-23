/**
 * Module dependencies
 */

var resolve = require('component-resolver');
var Build = require('component-builder');
var ignores = require('./ignore');
var jade = require('./jade');
var stylus = require('./stylus');
var poe = require('./poe');
var plugins = Build.plugins;
var write = require('fs').writeFileSync;
var mkdirp = require('mkdirp');
var dirname = require('path').dirname;

exports.scripts = function(path, ignore, out) {
  resolve(path, {
    install: true
  }, function(err, tree) {
    if (err) throw err;

    ignores[ignore](tree);

    var autoload = ignore === 'vendor' && poe.init(tree);

    Build.scripts(tree)
      .use('scripts', poe.js(autoload), plugins.js())
      .use('json', plugins.json())
      .use('templates', jade(), plugins.string())
      .end(function(err, str) {
        if (err) throw err;
        mkdirp(dirname(out), function(err) {
          if (err) throw err;
          write(out, str);
        });
      });
  });
};

exports.styles = function(path, out) {
  resolve(path, {
    install: true
  }, function(err, tree) {
    if (err) throw err;

    poe.init(tree, true);

    Build.styles(tree)
      .use('images', plugins.copy())
      .use('fonts', plugins.copy())
      .use('files', plugins.copy())
      .use('styles', stylus(), plugins.urlRewriter(''))
      .end(function(err, str) {
        if (err) throw err;
        mkdirp(dirname(out), function(err) {
          if (err) throw err;
          write(out, str);
        });
      });
  });
};

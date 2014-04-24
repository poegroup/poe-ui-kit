/**
 * Module dependencies
 */

var resolve = require('component-resolver');
var Remotes = require('remotes');
var Build = require('component-builder');
var GitHubContentAPI = require('component-github-content-api');
var ignores = require('./ignore');
var jade = require('./jade');
var stylus = require('./stylus');
var poe = require('./poe');
var plugins = Build.plugins;
var write = require('fs').writeFileSync;
var mkdirp = require('mkdirp');
var dirname = require('path').dirname;

var remotes = Remotes({
  local: true,
  out: 'components'
});

// replace the github remote

var github = new GitHubContentAPI();
remotes.remotes.push(github);
remotes.remote.github = github;

var opts = {
  install: true,
  dev: process.env.NODE_ENV === 'development',
  remote: remotes
};

exports.scripts = function(path, ignore, out) {
  resolve(path, opts, function(err, tree) {
    if (err) error(err);

    ignores[ignore](tree);

    var autoload = ignore === 'vendor' && poe.init(tree);

    Build.scripts(tree)
      .use('scripts', poe.js(autoload), plugins.js())
      .use('json', plugins.json())
      .use('templates', jade(), plugins.string())
      .end(function(err, str) {
        if (err) error(err);
        mkdirp(dirname(out), function(err) {
          if (err) error(err);
          write(out, str);
        });
      });
  });
};

exports.styles = function(path, out) {
  resolve(path, opts, function(err, tree) {
    if (err) error(err);

    var loaded = false;

    poe.init(tree, true);

    Build.styles(tree)
      .use('styles', stylus(), plugins.urlRewriter(''))
      .end(function(err, str) {
        if (err) error(err);
        mkdirp(dirname(out), function(err) {
          if (err) error(err);
          write(out, str);
        });
      });

    Build.files(tree)
      .use('images', plugins.copy())
      .use('fonts', plugins.copy())
      .use('files', plugins.copy())
      .end(function(err) {
        if (err) error(err);
      });
  });
};

function error(err) {
  console.log(err.stack || err);
  process.exit(1);
}

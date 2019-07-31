const gulp = require('gulp');
const path = require('path');

const closureCompiler = require('google-closure-compiler').gulp();
const crass = require('gulp-crass');
const htmlmin = require('gulp-htmlmin');
const brotli = require('gulp-brotli');

function jsMin(f) {
  return gulp.src(f, {base: './'})
      .pipe(closureCompiler({
        compilation_level: 'ADVANCED',
        language_in: 'ECMASCRIPT_2019',
        assume_function_wrapper: true,
        js_output_file: f.substring(13),
        output_wrapper: '(function(){%output%})();',
        jscomp_off: 'checkVars',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest(`./static/js/`))
      .on('end', function() {
        console.log(` [brotlify] ${f.replace('staticDev/', 'static/')}.br`);
        brotlify(f.replace('staticDev/', 'static/'));
      });
}

function cssMin(f) {
  return gulp.src(f)
      .pipe(crass({
        optimize: true,
        O1: true,
      }))
      .pipe(gulp.dest(`./static/css/`))
      .on('end', function() {
        console.log(` [brotlify] ${f.replace('staticDev/', 'static/')}.br`);
        brotlify(f.replace('staticDev/', 'static/'));
      });
}

function htmlMin(f) {
  return gulp.src(f)
      .pipe(htmlmin({
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        minifyCSS: true,
        minifyJS: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        sortAttributes: true,
        sortClassName: true,
      }))
      .pipe(gulp.dest(path.dirname(f.replace('viewsDev/', 'views/'))));
}

function brotlify(f) {
  return gulp.src(f)
      .pipe(brotli.compress({
        skipLarger: true,
        mode: 0,
        quality: 11,
        lgwin: 24,
        lgblock: 0,
      }))
      .pipe(gulp.dest(path.dirname(f)));
}

function watcher() {
  gulp.watch('./staticDev/js/*.js').on('change', function(f) {
    jsMin(f);
    console.log(` [jsMin] ${f}`);
  });

  gulp.watch('./staticDev/css/*.css').on('change', function(f) {
    cssMin(f);
    console.log(` [cssMin] ${f}`);
  });
  gulp.watch('./viewsDev/**/*.handlebars').on('change', function(f) {
    htmlMin(f);
    console.log(` [htmlMin] ${f}`);
  });
}

exports.watcher = watcher;

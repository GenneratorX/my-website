const grunt = require('grunt');
require('google-closure-compiler').grunt(grunt, {
  platform: ['native', 'javascript'],
});

grunt.loadNpmTasks('grunt-node-minify');
grunt.loadNpmTasks('grunt-newer');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-run');


grunt.initConfig({
  'closure-compiler': {
    jsMin: {
      options: {
        compilation_level: 'ADVANCED',
        language_in: 'ECMASCRIPT_2019',
        assume_function_wrapper: true,
        output_wrapper: '(function(){%output%})();',
        jscomp_off: 'checkVars',
      },
      files: grunt.file.expandMapping(['./staticDev/js/*.js'], './static/', {
        rename: function(destBase, destPath) {
          return destBase+destPath.substring(12);
        },
      }),
    },
  },
  'node-minify': {
    cssMin: {
      compressor: 'crass',
      options: {
        optimize: true,
        O1: true,
      },
      files: grunt.file.expandMapping(['./staticDev/css/*.css'], './static/', {
        rename: function(destBase, destPath) {
          return destBase+destPath.substring(12);
        },
      }),
    },
    htmlMin: {
      compressor: 'html-minifier',
      options: {
        minifyCSS: true,
        minifyJS: true,
        removeEmptyElements: false,
        removeOptionalTags: false,
        removeAttributeQuotes: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        sortAttributes: true,
        sortClassName: true,
      },
      files: grunt.file.expandMapping(['./viewsDev/*.html', './viewsDev/**/*.html'], './views/', {
        rename: function(destBase, destPath) {
          return destBase+destPath.substring(11).replace('.html', '.handlebars');
        },
      }),
    },
  },
  'watch': {
    js: {
      files: './staticDev/js/*.js',
      tasks: ['newer:closure-compiler', 'run:brotli'],
    },
    css: {
      files: './staticDev/css/*.css',
      tasks: ['newer:node-minify:cssMin', 'run:brotli'],
    },
    html: {
      files: ['./viewsDev/*.html', './viewsDev/**/*.html'],
      tasks: ['newer:node-minify:htmlMin'],
    },
  },
  'run': {
    brotli: {
      exec: 'node brotlify.js',
    },
  },
});

grunt.registerTask('default', ['closure-compiler', 'node-minify:cssMin', 'node-minify:htmlMin']);

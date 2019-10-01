'use strict';

import chokidar = require('chokidar');
import { promises as fs } from 'fs';

import typescript = require('typescript');
import crass = require('crass');
import { compiler } from 'google-closure-compiler';
import { minify } from 'html-minifier';
import { compress } from 'iltorb';

const pathSrcJs = 'src/static/js/';

const watcher = chokidar.watch(['./src', './app'], {
  ignored: /.*\.br$/,
  persistent: true,
  depth: 3,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
  cwd: './',
  ignoreInitial: true,
});

const log = console.log.bind(console);

watcher
  .on('add', (path) => {
    log(`[ADD] ${path}`);
    onchange(path);
  })
  .on('change', (path) => {
    onchange(path);
  })
  .on('unlink', (path) => {
    log(`[REMOVE] ${path}`);
    if (path.startsWith('src/')) {
      const extension = path.substring(path.indexOf('.'));
      switch (extension) {
        case '.ts':
          if (path.startsWith(pathSrcJs)) {
            fs.unlink(`${path.replace('src/', 'app/').slice(0, -2)}js`);
          }
          break;
        default:
          fs.unlink(path.replace('src/', 'app/')).catch((error) => log(error));
          if (/.*\.(css|js|html|svg|xml|webmanifest|json)/.test(extension)) {
            log(`[CLEANUP] ${path}`);
            fs.unlink(`${path.replace('src/', 'app/')}.br`).catch((error) => log(error));
          }
      }
    }
  });

/**
 * Function used on ADD/CHANGE events in chokidar watcher instance
 * @param path Path of the file
 */
function onchange(path: string): void {
  const extension = path.substring(path.indexOf('.'));
  if (path.startsWith('src/')) {
    const writepath = path.replace('src/', 'app/');
    switch (extension) {
      case '.ts':
        log(`[TS->JS] ${path}`);
        if (path.startsWith(pathSrcJs)) {
          fs.readdir(pathSrcJs)
            .then((files) => {
              const readBuffer: Promise<Buffer>[] = [];
              for (let i = 0; i < files.length; i++) {
                const filepath = pathSrcJs + files[i];
                log(` - [JSmin] ${filepath}`);
                readBuffer.push(fs.readFile(filepath));
              }
              Promise.all(readBuffer)
                .then((buffers) => {
                  const writeAll: Promise<void>[] = [];
                  for (let i = 0; i < buffers.length; i++) {
                    writeAll.push(fs.writeFile(`example/${files[i].slice(0, -2)}js`, tsJS(buffers[i].toString())));
                  }
                  Promise.all(writeAll)
                    .then(() => {
                      jsMin();
                    })
                    .catch((error) => log(error));
                })
                .catch((error) => log(error));
            })
            .catch((error) => log(error));
        } else {
          fs.readFile(path)
            .then((buffer) => {
              fs.writeFile(`${writepath.slice(0, -2)}js`, tsJS(buffer.toString())).catch((error) => log(error));
            })
            .catch((error) => log(error));
        }
        break;
      case '.css':
        log(`[CSSmin] ${path}`);
        cssMin(path)
          .then((min) => {
            fs.writeFile(writepath, min).catch((error) => log(error));
          })
          .catch((error) => log(error));
        break;
      case '.webmanifest':
        log(`[JSONmin] ${path}`);
        fs.readFile(path)
          .then((buffer) => {
            fs.writeFile(writepath, JSON.stringify(JSON.parse(buffer.toString()))).catch((error) => log(error));
          })
          .catch((error) => log(error));
        break;
      case '.handlebars':
      case '.html':
      case '.xml':
        log(`[HTMLmin] ${path}`);
        htmlMin(path)
          .then((min) => {
            fs.writeFile(writepath, min).catch((error) => log(error));
          })
          .catch((error) => log(error));
        break;
      default:
        log(`[COPY] ${path}`);
        fs.copyFile(path, writepath).catch((error) => log(error));
    }
  } else {
    if (path.startsWith('app/static/')) {
      if (/.*\.(css|js|html|svg|xml|webmanifest|json)$/.test(extension)) {
        log(`[Brotli] ${path}`);
        brotlify(path);
      }
    }
  }
}

/**
 * Compresses files using Brotli
 * @param f Relative path of the file
 */
function brotlify(f: string): void {
  fs.readFile(f)
    .then((buffer) => {
      compress(buffer, {
        'mode': 1, // text
        'quality': 11,
        'lgwin': 24,
        'lgblock': 0,
      })
        .then((compressed: Buffer) => {
          if (compressed.byteLength < buffer.byteLength) {
            fs.writeFile(`${f}.br`, compressed).catch((error) => log(error));
          } else {
            log('Compressed > Original file');
          }
        })
        .catch((error) => log(error));
    })
    .catch((error) => log(error));
}

/**
 * Minifies JS files with Closure Compiler
 */
function jsMin(): void {
  new compiler({
    'js': 'example/*.js',
    'compilation_level': 'ADVANCED',
    'language_in': 'ECMASCRIPT_2019',
    'language_out': 'ECMASCRIPT_2017',
    'assume_function_wrapper': true,
    'use_types_for_optimization': true,
    'charset': 'UTF-8',
    'externs': 'externs/YoutubeAPI.js',
  }).run((exitCode: number, stdOut: string, stdErr: string) => {
    if (exitCode == 0) {
      if (stdErr) {
        log(`=============================================\n${stdErr}=============================================\n`);
      }
      const f = stdOut.split(/\/\*\n\s(.*).\*\/\n/);
      if (f.length > 0) {
        const writeAll: Promise<void>[] = [];
        for (let i = 1; i < f.length; i += 2) {
          writeAll.push(fs.writeFile(`app/static/js/${f[i]}`, f[i + 1].replace(/\n/g, '')));
        }
        Promise.all(writeAll)
          .then(() => {
            fs.readdir('example/')
              .then((files) => {
                for (let i = 0; i < files.length; i++) {
                  if (files[i].endsWith('.js')) {
                    fs.unlink(`example/${files[i]}`).catch((error) => log(error));
                  }
                }
              })
              .catch((error) => log(error));
          })
          .catch((error) => log(error));
      }
    } else {
      log(`Code: [${exitCode}]`);
      log(`Error: [${stdErr}]`);
    }
  });
}

/**
 * Transpiles TypeScript to JavaScript code
 * @param f TypeScript code
 * @return JavaScript code
 */
function tsJS(f: string): string {
  return typescript.transpileModule(f, {
    'compilerOptions': {
      'module': typescript.ModuleKind.CommonJS,
      'target': typescript.ScriptTarget.ES2020,
      'alwaysStrict': true,
      'strict': true,
      'noImplicitAny': true,
      'removeComments': false,
      'preserveConstEnums': true,
      'sourceMap': false,
    },
  }).outputText;
}

/**
 * Minifies CSS with Crass
 * @param f Relative path of the css file
 * @return Minified CSS code
 */
async function cssMin(f: string): Promise<string> {
  const file = await fs.readFile(f);
  return crass
    .parse(file.toString())
    .optimize({ o1: true })
    .toString();
}

/**
 * Minifies files with HTML-minifier
 * @param f Relative path of the file
 * @return Minified code
 */
async function htmlMin(f: string): Promise<string> {
  const file = await fs.readFile(f);
  return minify(file.toString(), {
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    includeAutoGeneratedTags: true,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true,
    sortClassName: true,
  });
}

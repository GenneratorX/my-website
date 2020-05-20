'use strict';

import chokidar = require('chokidar');
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { brotliCompress, gzip, constants } from 'zlib';

import typescript = require('typescript');
import crass = require('crass');
import { minify } from 'html-minifier';

/**
 * The path to all front-end JS
 */
const pathSrcJs = 'src/static/js/';

const compressibleFileTypes = /.*\.(css|js|html|svg|xml|webmanifest|json)$/;

const watcher = chokidar.watch(['./src', './app'], {
  ignored: [/.*\.(br|gz)$/, './src/interfaces'],
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
          if (compressibleFileTypes.test(extension)) {
            log(`[CLEANUP] ${path}`);
            fs.unlink(`${path.replace('src/', 'app/')}.br`).catch((error) => log(error));
            fs.unlink(`${path.replace('src/', 'app/')}.gz`).catch((error) => log(error));
          }
      }
    }
  });

/**
 * Function used on ADD/CHANGE events in the Chokidar Watcher instance
 * @param path Path of the file
 */
function onchange(path: string): void {
  const extension = path.substring(path.indexOf('.'));
  if (path.startsWith('src/')) {
    const writePath = path.replace('src/', 'app/');
    switch (extension) {
      case '.ts':
        log(`[TS->JS] ${path}`);
        if (path.startsWith(pathSrcJs)) {
          fs.readdir(pathSrcJs)
            .then((files) => {
              /**
               * Read all files from 'src/static/js'.
               */
              const readBuffer: Promise<Buffer>[] = [];
              for (let i = 0; i < files.length; i++) {
                const filepath = pathSrcJs + files[i];
                log(` - [JSmin] ${filepath}`);
                readBuffer.push(fs.readFile(filepath));
              }
              Promise.all(readBuffer)
                .then((buffers) => {
                  let concat = '';
                  for (let i = 0; i < buffers.length; i++) {
                    /**
                     * Add 'window.fileName' variable with the file name as its value at the end of each file (to be
                     * able to differentiate them later) and concatenate them all.
                     */
                    concat += tsJS(buffers[i].toString() + `window.fileName='${files[i].slice(0, -2)}js';`);
                  }
                  /**
                   * Google Closure Compiler does not like multiple 'use strict'; statements so remove them all
                   * He also does not like the '__esModule' property that gets added by the TypeScript transpiler
                   * so remove it too if exists.
                   */
                  jsMin(concat.
                    replace(/'use strict';/g, '').
                    replace(/Object\.defineProperty\(exports, "__esModule", { value: true }\);/g, ''));
                })
                .catch((error) => log(error));
            })
            .catch((error) => log(error));
        } else {
          fs.readFile(path)
            .then((buffer) => {
              fs.writeFile(`${writePath.slice(0, -2)}js`, tsJS(buffer.toString())).catch((error) => log(error));
            })
            .catch((error) => log(error));
        }
        break;
      case '.css':
        log(`[CSSmin] ${path}`);
        cssMin(path)
          .then((min) => {
            fs.writeFile(writePath, min).catch((error) => log(error));
          })
          .catch((error) => log(error));
        break;
      case '.webmanifest':
        log(`[JSONmin] ${path}`);
        fs.readFile(path)
          .then((buffer) => {
            fs.writeFile(writePath, JSON.stringify(JSON.parse(buffer.toString()))).catch((error) => log(error));
          })
          .catch((error) => log(error));
        break;
      case '.handlebars':
      case '.html':
      case '.xml':
        log(`[HTMLmin] ${path}`);
        htmlMin(path)
          .then((min) => {
            fs.writeFile(writePath, min).catch((error) => log(error));
          })
          .catch((error) => log(error));
        break;
      default:
        log(`[COPY] ${path}`);
        fs.copyFile(path, writePath).catch((error) => log(error));
    }
  } else {
    if (path.startsWith('app/static/')) {
      if (compressibleFileTypes.test(extension)) {
        log(`[Compress] ${path}`);
        compress(path);
      }
    }
  }
}

/**
 * Minifies JS code with Google Closure Compiler
 * @param code JS code
 */
function jsMin(code: string): void {
  const child = spawn('java', ['-jar', 'node_modules/google-closure-compiler-java/compiler.jar',
    '--compilation_level=ADVANCED',
    '--language_in=ECMASCRIPT_2019',
    '--language_out=ECMASCRIPT_2017',
    '--assume_function_wrapper',
    '--use_types_for_optimization',
    '--strict_mode_input',
    '--charset=UTF-8',
    '--externs=externs/YoutubeAPI.js'
  ]);
  child.stdin.setDefaultEncoding('utf8');
  child.stdin.write(code);
  child.stdin.end();

  child.stderr.on('data', function(data: Buffer) {
    console.log(data.toString());
  });

  let output: Buffer;
  child.stdout.on('data', (data: Buffer) => {
    if (!output) {
      output = data;
    } else {
      output = Buffer.concat([output, data]);
    }
  });

  child.stdout.on('end', function() {
    /**
     * Remove all endlines left behind by the Closure Compiler and split the code based on the 'window.fileName'
     * variable defined earlier.
     *
     * The 'splitBuffer' is structured like this:
     *  - odd indexes are the file names
     *  - even indexes are the 'compiled' code
     *  - last item is an empty string
     */
    if (output !== undefined) {
      const splitBuffer = output.toString().replace(/\n/g, '').split(/window\.fileName="(.*?)";/);
      if (splitBuffer) {
        /**
         * First file always starts with the 'use strict'; statement so it needs to be handled separately.
         */
        fs.writeFile(`app/static/js/${splitBuffer[1]}`, splitBuffer[0]);
        for (let i = 2; i < splitBuffer.length - 1; i += 2) {
          fs.writeFile(`app/static/js/${splitBuffer[i + 1]}`, '\'use strict\';' + splitBuffer[i]);
        }
      }
    }
  });
}

/**
 * Transpiles TypeScript to JavaScript code
 * @param code TypeScript code
 * @return JavaScript code
 */
function tsJS(code: string): string {
  return typescript.transpileModule(code, {
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
 * Compresses files using Brotli and Gzip
 * @param path Relative path of the file
 */
function compress(path: string): void {
  fs.readFile(path)
    .then((buffer) => {
      brotliCompress(buffer, {
        params: {
          [constants.BROTLI_PARAM_MODE]: 1,     // text
          [constants.BROTLI_PARAM_QUALITY]: 11, // max quality
          [constants.BROTLI_PARAM_LGWIN]: 24,   // max sliding window size (LZ77)
          [constants.BROTLI_PARAM_LGBLOCK]: 0,  // auto input block size
        },
      }, (error, compressedBuffer) => {
        if (!error) {
          if (compressedBuffer.byteLength < buffer.byteLength) {
            fs.writeFile(`${path}.br`, compressedBuffer).catch((error) => log(error));
          } else {
            log('[Brotli] Compressed > Original file');
          }
        } else {
          log(error);
        }
      });
      gzip(buffer, {
        level: 9,    // max quality
        memLevel: 9, // max memory usage
      }, (error, compressedBuffer) => {
        if (!error) {
          if (compressedBuffer.byteLength < buffer.byteLength) {
            fs.writeFile(`${path}.gz`, compressedBuffer).catch((error) => log(error));
          } else {
            log('[GZip] Compressed > Original file');
          }
        } else {
          log(error);
        }
      });
    })
    .catch((error) => log(error));
}

/**
 * Minifies CSS with Crass
 * @param path Relative path of the CSS file
 * @return Minified CSS code
 */
async function cssMin(path: string): Promise<string> {
  const file = await fs.readFile(path);
  return crass
    .parse(file.toString())
    .optimize({ o1: true })
    .toString();
}

/**
 * Minifies files with HTML-minifier
 * @param path Relative path of the file
 * @return Minified code
 */
async function htmlMin(path: string): Promise<string> {
  const file = await fs.readFile(path);
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

'use strict';

import express = require('express');
import exhb = require('express-handlebars');
import bodyParser = require('body-parser');
import session = require('express-session');
import Redis = require('ioredis');
const RedisStore = require('connect-redis')(session); // eslint-disable-line @typescript-eslint/no-var-requires
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Server as WSServer } from 'ws';

import crypto = require('crypto');
import https = require('https');

import * as env from './env';
import * as auth from './modules/auth';
import * as db from './modules/db';
import * as util from './modules/util';

const app = express();
const server = app.listen(env.PORT, () => console.log(`Aplicatia ruleaza pe portul ${env.PORT}!`));

app.engine('handlebars', exhb({
  layoutsDir: 'app/views/layouts',
  partialsDir: 'app/views/partials',
  helpers: {
    section: function(name: string, options: any): null {
      if (!this._sections) {
        this._sections = {};
      }
      this._sections[name] = options.fn(this);
      return null;
    },
  },
}));

app.set('view engine', 'handlebars');
app.set('views', 'app/views');
app.set('x-powered-by', false);
app.set('etag', false);
app.set('trust proxy', '127.0.0.1');

app.use(bodyParser.json({
  strict: true,
  type: 'application/json',
}));

// WEBSOCKET -----------------------------------------------------------------------------------------------------------
const wss = new WSServer({ path: '/ws', maxPayload: 200, noServer: true });

let i = 1;
const usedNumbers: string[] = [];
const colors = [
  'red',
  'green',
  'blue',
  'orange',
  'purple',
  'yellow',
  'brown',
  'pink',
  'teal'
];

let roomMaster = '';

const videoList: string[] = [];
let currentVideo = '';
let readyCheck: string[] = [];

wss.on('connection', (ws) => {
  // Socket custom properties ------------------------------------------------------------------------------------------
  ws.isAlive = true;
  if (usedNumbers.length != 0) {
    ws.name = 'Anonim-' + usedNumbers.shift();
  } else {
    ws.name = 'Anonim-' + i;
    i++;
  }
  ws.color = colors[Math.floor(Math.random() * colors.length)];
  // Announce room join and send info of the room ----------------------------------------------------------------------
  const userList: [{ name: string; color: string }] = [{ name: ws.name; color: ws.color }];
  for (const client of wss.clients) {
    if (client != ws) {
      userList.push({ name: client.name; color: client.color });
      client.send(JSON.stringify({
        event: 'userConnect',
        user: {
          name: ws.name,
          color: ws.color,
        },
      }));
    }
  }
  wsSendMessage('currentUser', {
    event: 'join',
    userList: userList,
    videoList: videoList,
    currentVideo: currentVideo,
  });

  if (wss.clients.size == 1) {
    roomMaster = ws.name;
    wsSendMessage('currentUser', {
      event: 'roomMaster',
    });
  }
  // -------------------------------------------------------------------------------------------------------------------
  ws.on('message', (message) => {
    let data: { [prop: string]: string };
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      data = { validJSON: 'no' };
    }
    if (!data.validJSON && data.event) {
      switch (data.event) {
        case 'userMessage':
          if (data.message) {
            wsSendMessage('all', {
              event: 'userMessage',
              username: ws.name,
              message: data.message,
            });
          }
          break;
        case 'ytAddVideo':
          if (data.videoID && /^[a-zA-Z0-9_-]{11}$/.test(data.videoID)) {
            if (!videoList.includes(data.videoID)) {
              https.request({
                hostname: 'i.ytimg.com',
                port: 443,
                path: `/vi/${data.videoID}/default.jpg`,
                method: 'HEAD',
              }, (res) => {
                if (res.statusCode == 200) {
                  videoList.push(data.videoID);
                  if (videoList.length == 1) {
                    currentVideo = data.videoID;
                  }
                  wsSendMessage('all', {
                    event: 'ytAddVideo',
                    status: 'addVideo',
                    videoID: data.videoID,
                  });
                } else {
                  wsSendMessage('currentUser', {
                    event: 'ytAddVideo',
                    status: 'notAvailable',
                  });
                }
              }).on('error', (error) => {
                console.log(error);
                wsSendMessage('currentUser', {
                  event: 'ytAddVideo',
                  status: 'connectionError',
                });
              }).end();
            } else {
              wsSendMessage('currentUser', {
                event: 'ytAddVideo',
                status: 'videoExists',
              });
            }
          }
          break;
        case 'ytRemoveVideo':
          if (data.videoID && videoList.includes(data.videoID)) {
            for (let i = 0; i < videoList.length; i++) {
              if (videoList[i] == data.videoID) {
                videoList.splice(i, 1);
                if (currentVideo == data.videoID) {
                  currentVideo = '';
                }
                i = videoList.length;
              }
            }
            wsSendMessage('all', {
              event: 'ytRemoveVideo',
              videoID: data.videoID,
            });
          }
          break;
        case 'ytCueVideo':
          if (data.videoID && videoList.includes(data.videoID)) {
            currentVideo = data.videoID;
            wsSendMessage('all', {
              event: 'ytCueVideo',
              videoID: data.videoID,
            });
          }
          break;
        case 'ytStartVideo':
          if (currentVideo != '') {
            wsSendMessage('allExceptCurrentUser', {
              event: 'ytStartVideo',
            });
          }
          break;
        case 'ytStartVideoReady':
          readyCheck.push(ws.name);
          if (readyCheck.length == wss.clients.size) {
            readyCheck = [];
            wsSendMessage('all', {
              event: 'ytPlayVideo',
            });
          }
          break;
      }
    }
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    usedNumbers.push(ws.name.split('-')[1]);
    wsSendMessage('allExceptCurrentUser', {
      event: 'userDisconnect',
      username: ws.name,
    });
    if (wss.clients.size > 0) {
      if (ws.name == roomMaster) {
        // select random client to be room master
      }
    } else {
      roomMaster = '';
      // videoList = [];
    }
  });

  ws.on('error', (err) => {
    console.log(err);
  });

  /**
   * Sends a message to the clients of the WebSocket
   * @param to To whom to send the message
   * @param message The message to send
   */
  function wsSendMessage(to: 'all' | 'allExceptCurrentUser' | 'currentUser', message: { [prop: string]: any }): void {
    switch (to) {
      case 'all':
        for (const client of wss.clients) {
          client.send(JSON.stringify(message));
        }
        break;
      case 'allExceptCurrentUser':
        for (const client of wss.clients) {
          if (client != ws)
            client.send(JSON.stringify(message));
        }
        break;
      case 'currentUser':
        ws.send(JSON.stringify(message));
        break;
    }
  }
});

server.on('upgrade', function(req, socket, head) {
  if (req.headers.origin && req.headers.origin === 'https://gennerator.com') {
    wss.handleUpgrade(req, socket, head, function(ws) {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
    return;
  }
});

setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(null);
  });
}, 25000);
// ---------------------------------------------------------------------------------------------------------------------

const client = new Redis({ enableOfflineQueue: false });

app.use(session({ // lgtm [js/missing-token-validation]
  name: '__Host-sessionID',
  secret: env.COOKIE_SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: true,
  },
  store: new RedisStore({
    client: client,
    ttl: 43200, // 12 hours
    disableTouch: true,
  }),
  genid: function(req) {
    if (req.originalUrl == '/loginUser') {
      return crypto.randomBytes(128).toString('base64');
    }
    return '';
  },
}));

const rateLimiterRedis = new RateLimiterRedis({
  storeClient: client,
  points: 6,
  duration: 60,
});

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  rateLimiterRedis
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({ response: 'RATE_LIMIT' });
    });
};

app.get('*', function(req, res, next) {
  crypto.randomBytes(16, (error, buffer) => {
    if (!error) {
      res.locals.nonce = buffer.toString('base64');
      res.setHeader('Content-Security-Policy',
        `default-src 'none'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; ` +
        `frame-ancestors 'none'; img-src 'self'; manifest-src 'self'; media-src 'self'; object-src 'none'; ` +
        `report-to default; report-uri https://gennerator.report-uri.com/r/d/csp/enforce; ` +
        `script-src 'strict-dynamic' 'nonce-${res.locals.nonce}'; style-src 'self' 'nonce-${res.locals.nonce}'`
      );
      res.setHeader('Feature-Policy',
        `accelerometer 'none'; ambient-light-sensor 'none'; autoplay 'none'; camera 'none'; encrypted-media 'none'; ` +
        `fullscreen 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; ` +
        `midi 'none'; payment 'none'; speaker 'none'; sync-xhr 'none'; usb 'none'; vr 'none'`
      );
      res.setHeader('Referrer-Policy', 'same-origin');
      next();
    } else {
      console.log(error);
      res.status(500).render('500');
    }
  });
});

app.use(function(req, res, next) {
  if (req.session) {
    res.locals.userName = req.session.username;
    res.locals.greetingMessage = util.greetingMessage();
  }
  res.locals.pageURL = req.originalUrl;
  next();
});

app.get('/', function(req, res) {
  res.render('index', {
    pageTitle: 'Acasă',
    pageDescription: 'Site realizat de mine pentru a satisface nevoile mele. Copyright Gennerator.',
  });
});

app.get('/filme', function(req, res) {
  res.render('filme', {
    pageTitle: 'Filme',
    pageDescription: 'Evidență filme vizualizate, statistici și informații detaliate despre fiecare film.',
  });
});

app.get('/muzica', function(req, res) {
  res.render('muzica', {
    pageTitle: 'Muzică',
    pageDescription: 'Player audio pentru melodiile personale, playlist-uri și organizare melodii.',
  });
});

app.get('/partajare', function(req, res) {
  res.render('partajare', {
    pageTitle: 'Partajare',
    pageDescription: 'Partajare privată de fișiere, încărcare și organizare fișiere personale.',
  });
});

app.get('/sync', function(req, res) {
  res.setHeader('Content-Security-Policy',
    `default-src 'none'; base-uri 'none'; connect-src 'self' wss://gennerator.com/ws ` +
    `https://noembed.com/embed; font-src 'self'; form-action 'self'; frame-ancestors 'none'; ` +
    `frame-src https://www.youtube.com/embed/; img-src 'self' https://i.ytimg.com; manifest-src 'self'; ` +
    `media-src 'self'; object-src 'none'; ` +
    `report-to default; report-uri https://gennerator.report-uri.com/r/d/csp/enforce; ` +
    `script-src 'strict-dynamic' 'nonce-${res.locals.nonce}'; style-src 'self' 'nonce-${res.locals.nonce}'`
  );
  res.setHeader('Feature-Policy',
    `accelerometer 'self'; ambient-light-sensor 'none'; autoplay 'self'; camera 'none'; encrypted-media 'self'; ` +
    `fullscreen 'self'; geolocation 'none'; gyroscope 'self'; magnetometer 'none'; microphone 'none'; ` +
    `midi 'none'; payment 'none'; speaker 'self'; sync-xhr 'none'; usb 'none'; vr 'none'`
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.render('sync', {
    pageTitle: 'Youtube Sync',
    pageDescription: 'Vizualizare conținut YouTube în grup',
  });
});

app.get('/activate', function(req, res) {
  if (req.query.act) {
    auth
      .enableUser(req.query.act)
      .then((f) => {
        if (f) {
          res.render('activate');
        } else {
          res.redirect('back');
        }
      })
      .catch((r) => {
        console.log(r);
        res.status(500).render('500');
      });
  } else {
    res.redirect('back');
  }
});

app.get('/login', function(req, res) {
  if (!res.locals.userName) {
    res.render('login', {
      pageTitle: 'Login',
      pageDescription: 'Autentificare utilizator, creare cont utilizator și recuperare credențiale.',
    });
  } else {
    res.redirect('/');
  }
});

app.get('/logOut', function(req, res) {
  if (req.session) {
    req.session.destroy((error) => {
      if (error) console.log(error);
    });
    res.clearCookie('__Host-sessionID', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: true,
    });
    res.redirect('back');
  }
});

app.post('/loginUser', rateLimiter, function(req, res) {
  if (req.body.username && req.body.password) {
    auth
      .loginUser(req.body.username, req.body.password)
      .then((f) => {
        if (f == true) {
          db.query('SELECT username FROM users WHERE LOWER(username) = LOWER($1);', [req.body.username])
            .then((f) => {
              if (f) {
                res.locals.userName = f.toString();
                if (req.session) {
                  req.session.username = res.locals.userName;
                }
                res.render('loginS', { layout: false }, (error, html) => {
                  if (!error) {
                    res.json({ response: true, msg: html });
                  } else {
                    res.status(500).json({ response: 'INTERNAL_ERROR' });
                  }
                });
              } else {
                res.status(500).json({ response: 'INTERNAL_ERROR' });
              }
            })
            .catch((r) => {
              console.log(r);
              res.status(500).json({ response: 'INTERNAL_ERROR' });
            });
        } else {
          res.json({ response: f });
        }
      })
      .catch((r) => {
        console.log(r);
        res.status(500).json({ response: 'INTERNAL_ERROR' });
      });
  } else {
    res.status(400).json({ response: `Cererea nu este corectă! Ieși acas'!` });
  }
});

app.post('/createUser', rateLimiter, function(req, res) {
  if (req.body.username && req.body.password && req.body.email && req.body.policy) {
    if (req.body.policy == true) {
      auth
        .createUser(req.body.username, req.body.password, req.body.email)
        .then((f) => {
          res.json({ response: f });
        })
        .catch((r) => {
          console.log(r);
          res.status(500).json({ response: 'INTERNAL_ERROR' });
        });
    } else {
      res.status(400).json({ response: `Cererea nu este corectă! Ieși acas'!` });
    }
  } else {
    res.status(400).json({ response: `Cererea nu este corectă! Ieși acas'!` });
  }
});

app.post('/usernameExists', function(req, res) {
  if (req.body.username) {
    auth
      .usernameExists(req.body.username)
      .then((f) => {
        res.json({ response: f });
      })
      .catch((r) => {
        console.log(r);
        res.status(500).json({ response: 'INTERNAL_ERROR' });
      });
  } else {
    res.status(400).json({ response: `Cererea nu este corectă! Ieși acas'!` });
  }
});

app.post('/emailExists', function(req, res) {
  if (req.body.email) {
    auth
      .emailExists(req.body.email)
      .then((f) => {
        res.json({ response: f });
      })
      .catch((r) => {
        console.log(r);
        res.status(500).json({ response: 'INTERNAL_ERROR' });
      });
  } else {
    res.status(400).json({ response: `Cererea nu este corectă! Ieși acas'!` });
  }
});

app.use(function(req, res) {
  res.status(404).render('404', {
    pageTitle: 'Nimic aici',
    pageDescription: 'Resursa accesată nu există',
  });
});

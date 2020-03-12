'use strict';

import express = require('express');
import exhb = require('express-handlebars');
import bodyParser = require('body-parser');
import session = require('express-session');
import Redis = require('ioredis');
const RedisStore = require('connect-redis')(session); // eslint-disable-line @typescript-eslint/no-var-requires
import { RateLimiterRedis } from 'rate-limiter-flexible';

import crypto = require('crypto');

import * as env from './env';
import * as auth from './modules/auth';
import * as db from './modules/db';
import * as util from './modules/util';

const app = express();
export const server = app.listen(env.PORT, () => console.log(`Aplicatia ruleaza pe portul ${env.PORT}!`));

// WEBSOCKET SERVER
import './modules/websocket';

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

const client = new Redis(env.REDIS_CONFIG);

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
        `default-src 'none'; base-uri 'none'; connect-src 'self'; font-src https://fonts.gstatic.com/s/raleway/; ` +
        `form-action 'self'; frame-ancestors 'none'; img-src https://static.gennerator.com; ` +
        `manifest-src https://static.gennerator.com; ` +
        `media-src 'self'; object-src 'none'; report-to default; ` +
        `report-uri https://gennerator.report-uri.com/r/d/csp/enforce; ` +
        `script-src 'strict-dynamic' 'nonce-${res.locals.nonce}'; ` +
        `style-src https://static.gennerator.com/css/ 'nonce-${res.locals.nonce}' https://fonts.googleapis.com/css`
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
  next();
});

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/filme', function(req, res) {
  res.render('filme');
});

app.get('/muzica', function(req, res) {
  res.render('muzica');
});

app.get('/partajare', function(req, res) {
  res.render('partajare');
});

app.get('/sync', function(req, res) {
  res.setHeader('Content-Security-Policy',
    `default-src 'none'; base-uri 'none'; connect-src 'self' ${env.WSS} https://noembed.com/embed; ` +
    `font-src https://fonts.gstatic.com/s/raleway/; form-action 'self'; frame-ancestors 'none'; ` +
    `frame-src https://www.youtube.com/embed/; img-src https://static.gennerator.com https://i.ytimg.com; ` +
    `manifest-src https://static.gennerator.com; media-src 'self'; object-src 'none'; ` +
    `report-to default; report-uri https://gennerator.report-uri.com/r/d/csp/enforce; ` +
    `script-src 'strict-dynamic' 'nonce-${res.locals.nonce}'; ` +
    `style-src https://static.gennerator.com/css/ 'nonce-${res.locals.nonce}' https://fonts.googleapis.com/css`
  );
  res.setHeader('Feature-Policy',
    `accelerometer 'self'; ambient-light-sensor 'none'; autoplay 'self'; camera 'none'; encrypted-media 'self'; ` +
    `fullscreen 'self'; geolocation 'none'; gyroscope 'self'; magnetometer 'none'; microphone 'none'; ` +
    `midi 'none'; payment 'none'; speaker 'self'; sync-xhr 'none'; usb 'none'; vr 'none'`
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.render('sync');
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
    res.render('login');
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
  if (req.body.username && req.body.password && req.body.email && req.body.policy && req.body.policy === true) {
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
  res.status(404).render('404');
});

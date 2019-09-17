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
app.engine('handlebars', exhb({
  layoutsDir: 'app/views/layouts',
  partialsDir: 'app/views/partials',
}));

app.set('view engine', 'handlebars');
app.set('views', 'app/views');
app.set('x-powered-by', false);
app.set('etag', false);
app.set('trust proxy', '127.0.0.1');

const client = new Redis({ enableOfflineQueue: false });

app.use(
  bodyParser.json({
    strict: true,
    type: 'application/json',
  })
);

app.use(
  session({
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
  })
);

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
      res.header('Content-Security-Policy',
        `default-src 'none'; script-src 'self' 'strict-dynamic' 'nonce-${res.locals.nonce}'; img-src 'self'; ` +
        `connect-src 'self'; style-src 'self' 'nonce-${res.locals.nonce}'; font-src 'self'; object-src 'none'; ` +
        `media-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; manifest-src 'self'; ` +
        `report-uri https://gennerator.report-uri.com/r/d/csp/enforce; report-to default`
      );
      res.header('Feature-Policy',
        `accelerometer 'none'; ambient-light-sensor 'none'; autoplay 'none'; camera 'none'; encrypted-media 'none'; ` +
        `fullscreen 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; ` +
        `midi 'none'; payment 'none'; speaker 'self'; sync-xhr 'none'; usb 'none'; vr 'none'`
      );
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
    pageDescription: 'Resursa accesată nu există'
  });
});

app.listen(env.PORT, () => console.log(`Aplicatia ruleaza pe portul ${env.PORT}!`));

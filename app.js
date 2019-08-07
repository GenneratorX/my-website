const express = require('express');
const exhb = require('express-handlebars');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const crypto = require('crypto');

const auth = require('./app/auth');
const db = require('./app/db');
const util = require('./app/util');

const app = express();
const port = 8000;

app.engine('handlebars', exhb());
app.set('view engine', 'handlebars');

app.set('x-powered-by', false);
app.set('etag', false);
app.set('trust proxy', '127.0.0.1');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(session({
  name: '__Host-sessionID',
  secret: process.env.COOKIE_SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: true,
    maxAge: null,
    sameSite: true,
  },
  store: new SQLiteStore({
    table: 'sessions',
    db: 'sessions.db',
    dir: './app/',
    concurrentDB: true,
  }),
  genid: function(req) {
    return crypto.randomBytes(128).toString('base64');
  },
}));

app.get('*', function(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  res.header('Content-Security-Policy', `default-src 'none'; script-src 'self' 'strict-dynamic' 'nonce-${res.locals.nonce}'; img-src 'self'; connect-src 'self'; style-src 'self' 'nonce-${res.locals.nonce}'; font-src 'self'; object-src 'none'; media-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; manifest-src 'self'; report-uri https://gennerator.report-uri.com/r/d/csp/enforce; report-to default`);
  res.header('Feature-Policy', `accelerometer 'none'; ambient-light-sensor 'none'; autoplay 'none'; camera 'none'; encrypted-media 'none'; fullscreen 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; speaker 'self'; sync-xhr 'none'; usb 'none'; vr 'none'`);
  res.header('Expect-CT', `max-age=1209600, enforce, report-uri=https://gennerator.report-uri.com/r/d/ct/enforce`);
  res.header('Report-To', `{"group":"default","max_age":31536000,"endpoints":[{"url":"https://gennerator.report-uri.com/a/d/g"}],"include_subdomains":true}`);
  res.header('Strict-Transport-Security', `max-age=31536000; includeSubDomains; preload`);
  res.header('Referrer-Policy', `strict-origin-when-cross-origin`);
  next();
});

app.use(function(req, res, next) {
  res.locals.userName = req.session.username;
  res.locals.greetingMessage = util.greetingMessage();

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

app.get('/login', function(req, res) {
  if (!res.locals.userName) {
    res.render('login');
  } else {
    res.redirect('/');
  }
});

app.get('/logOut', function(req, res) {
  if (req.session) {
    req.session.destroy();
    res.clearCookie('__Host-sessionID', {
      path: '/',
      httpOnly: true,
      secure: true,
      maxAge: null,
      sameSite: true,
    });
    res.redirect('/');
  }
});

app.post('/loginUser', function(req, res) {
  if (req.body.username && req.body.password) {
    auth.loginUser(req.body.username, req.body.password).then( (f) => {
      if (f == true) {
        db.query('SELECT username FROM users WHERE LOWER(username) = LOWER($1);', [req.body.username]).then( (f) => {
          res.locals.userName = f.toString();
          req.session.username = res.locals.userName;
          res.render('loginS', {layout: false});
        });
      } else {
        res.send(f);
      }
    });
  } else {
    res.send('Cererea nu este corectă! Ieși acas\'!');
  }
});

app.post('/createUser', function(req, res) {
  if (req.body.username && req.body.password) {
    auth.createUser(req.body.username, req.body.password).then( (f) => {
      res.send(f);
    });
  } else {
    res.send('Cererea nu este corectă! Ieși acas\'!');
  }
});

app.post('/usernameExists', function(req, res) {
  if (req.body.username) {
    auth.usernameExists(req.body.username).then( (f) => {
      res.send(f);
    });
  } else {
    res.send('Cererea nu este corectă! Ieși acas\'!');
  }
});

app.use(function(req, res) {
  res.status(404).render('404');
});

app.listen(port, () => console.log(`Aplicatia ruleaza pe portul ${port}!`));

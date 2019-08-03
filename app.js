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
  secret: 'DWhg/ea3LBnlXVd/4dC6+rU05kIqemLHFPCg2',
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
  }),
  genid: function(req) {
    return crypto.randomBytes(128).toString('base64');
  },
}));

app.use(function(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  res.header('Content-Security-Policy', `default-src 'none'; script-src 'self' 'strict-dynamic' 'nonce-${res.locals.nonce}'; img-src 'self'; connect-src 'self'; style-src 'self' 'nonce-${res.locals.nonce}'; font-src 'self'; object-src 'none'; media-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; manifest-src 'self'; report-uri https://gennerator.report-uri.com/r/d/csp/enforce; report-to default`);

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
  res.render('login');
});

app.post('/loginUser', function(req, res) {
  auth.loginUser(req.body.username, req.body.password).then( (f) => {
    if (f==0) {
      db.query('SELECT BINARY usr FROM usr WHERE usr = ?;', [req.body.username]).then( (f) => {
        res.locals.userName = f.toString();
        req.session.username = res.locals.userName;
        res.render('loginS');
      });
    } else if (f==1) {
      res.send('Este dezactivat!');
    } else {
      res.send('Nu este bun!');
    }
  });
});

app.post('/createUser', function(req, res) {
  if (req.body.username.length >= 6 && req.body.username.length <= 40 && req.body.password.length >= 8 && req.body.password.length <= 100) {
    auth.createUser(req.body.username, req.body.password).then( (f) => {
      if (f) {
        res.send('Cont creat cu succes!');
      } else {
        res.send('Contul de utilizator există deja!');
      }
    });
  } else {
    res.send('Parola sau username-ul nu respectă condițiile de lungime!');
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

app.post('/usernameExists', function(req, res) {
  if (req.body.username.length >= 6 && req.body.username.length <= 40) {
    auth.usernameExists(req.body.username).then( (f) => {
      res.send(f);
    });
  }
});

app.use(function(req, res) {
  res.status(404).render('404');
});

app.use(function(err, req, res, next) {
  console.log(err);
  res.status(500).render('500');
});

app.listen(port, () => console.log(`Aplicatia ruleaza pe portul ${port}!`));

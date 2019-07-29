const express = require('express');
const exhb = require('express-handlebars');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const auth = require('./app/auth');

const app = express();
const port = 8000;

app.engine('handlebars', exhb());
app.set('view engine', 'handlebars');

app.set('x-powered-by', false);
app.set('etag', false);

app.use(bodyParser.urlencoded({extended: true}));

app.use(function(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  app.locals.nonce = nonce;
  res.header('Content-Security-Policy', `default-src 'none'; script-src 'strict-dynamic' 'nonce-${nonce}' https:; img-src 'self'; connect-src 'self'; style-src 'self' 'nonce-${nonce}'; font-src 'self'; object-src 'none'; media-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; manifest-src 'self'; report-uri https://gennerator.report-uri.com/r/d/csp/enforce; report-to default`);
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

app.get('/neg', function(req, res) {
  res.render('asdsa');
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
      res.send('Este bun!');
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

app.use(function(req, res) {
  res.status(404).render('404');
});

app.use(function(err, req, res, next) {
  console.log(err);
  res.status(500).render('500');
});

app.listen(port, () => console.log(`Aplicatia ruleaza pe portul ${port}!`));
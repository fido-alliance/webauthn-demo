const express       = require('express');
const bodyParser    = require('body-parser');
const cookieSession = require('cookie-session');
const cookieParser  = require('cookie-parser');
const urllib        = require('url');
const path          = require('path');
const crypto        = require('crypto');
const x509          = require('@fidm/x509');
const iso_3166_1    = require('iso-3166-1');

const config        = require('./config.json');
const defaultroutes = require('./routes/default');
const passwordauth  = require('./routes/password');
const webauthnauth  = require('./routes/webauthn.js');

const app           = express();

app.use(bodyParser.json());

/* ----- session ----- */
app.use(cookieSession({
  name: 'session',
  keys: [crypto.randomBytes(32).toString('hex')],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(cookieParser())

/* ----- serve static ----- */
app.use(express.static(path.join(__dirname, 'static')));

app.use('/', defaultroutes)
app.use('/password', passwordauth)
app.use('/webauthn', webauthnauth)

const port = config.port || 3000;
app.listen(port);
console.log(`Started app on port ${port}`);

module.exports = app;

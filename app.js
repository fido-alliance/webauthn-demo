const express    = require('express');
const bodyParser = require('body-parser');
const urllib     = require('url');
const config     = require('./config.json');
const path       = require('path');
const app        = express();
const routes     = require('./routes');

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'static')));

app.use('/', routes)

const port = config.port || 3000;
app.listen(port);
console.log(`Started app on port ${port}`);

module.exports = app;

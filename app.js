const express    = require('express');
const bodyParser = require('body-parser');
const urllib     = require('url');
const config     = require('./config.json');
const path       = require('path');

const app = express();

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'static')));

app.post('/register', (request, response) => {
    response.json({})
})

app.post('/login', (request, response) => {
    response.json({})
})


const port = config.port || 3000;
app.listen(port);
console.log(`Started app on port ${port}`);

module.exports = app;

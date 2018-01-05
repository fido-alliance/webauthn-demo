const express    = require('express');
const urllib     = require('url');
const config     = require('./config.json');

const app  = express();
const port = config.port || 3000;

app.listen(port);

console.log(`Started app on port ${port}`);

app.post('/register', (request, response) => {
    response.json({})
})

app.post('/login', (request, response) => {
    response.json({})
})

module.exports = app;

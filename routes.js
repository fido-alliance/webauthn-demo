const express = require('express');
const router  = express.Router();


let database = {};
router.post('/register', (request, response) => {
    if(!request.body || !request.body.username || !request.body.password)
        response.json({
            'status': 'failed',
            'message': 'Request missing username or password!'
        });

    let username = request.body.username;
    let password = request.body.password;

    if(database[username])
        response.json({
            'status': 'failed',
            'message': `Username ${username} already exists`
        });


    database[username] = {
        'password': password
    }

    response.json({
        'status': 'ok'
    })
})

router.post('/login', (request, response) => {
    if(!request.body || !request.body.username || !request.body.password)
        response.json({
            'status': 'failed',
            'message': 'Request missing username or password!'
        });

    let username = request.body.username;
    let password = request.body.password;

    if(!database[username] || database[username].password !== password)
        response.json({
            'status': 'failed',
            'message': `Wrong username or password!`
        });

    response.json({
        'status': 'ok'
    })
})

module.exports = router;

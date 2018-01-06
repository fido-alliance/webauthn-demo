const express = require('express');
const router  = express.Router();

let database = {};
router.post('/register', (request, response) => {
    if(!request.body || !request.body.username || !request.body.password) {
        response.json({
            'status': 'failed',
            'message': 'Request missing username or password!'
        })

        return
    }

    let username = request.body.username;
    let password = request.body.password;

    if(database[username]) {
        response.json({
            'status': 'failed',
            'message': `Username ${username} already exists`
        })

        return
    }


    database[username] = {
        'password': password
    }

    request.session.loggedIn = true;

    response.json({
        'status': 'ok'
    })
})

router.post('/login', (request, response) => {
    if(!request.body || !request.body.username || !request.body.password) {
        response.json({
            'status': 'failed',
            'message': 'Request missing username or password!'
        });

        return
    }

    let username = request.body.username;
    let password = request.body.password;

    if(!database[username] || database[username].password !== password) {
        response.json({
            'status': 'failed',
            'message': `Wrong username or password!`
        });

        return
    }

    request.session.loggedIn = true;

    response.json({
        'status': 'ok'
    })
})

router.get('/isLoggedIn', (request, response) => {
    if(!request.session.loggedIn) {
        response.json({
            'status': 'failed'
        })
    } else {
        response.json({
            'status': 'ok'
        })
    }
})


router.get('/logout', (request, response) => {
    request.session.loggedIn = false;

    response.json({
        'status': 'ok'
    })
})
module.exports = router;

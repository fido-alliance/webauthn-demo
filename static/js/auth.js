/* Handle for register form submission */
$('#register').submit(function(event) {
    event.preventDefault();

    let username = this.username.value;
    let password = this.password.value;

    if(!username || !password) {
        alert('Username or password is missing!')
    }

    let formBody = {username, password}; 

    fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formBody)
    })
    .then((response) => response.json())
    .then((response) => {
        console.log(response)
    })
})

/* Handle for login form submission */
$('#login').submit(function(event) {
    event.preventDefault();

    let username = this.username.value;
    let password = this.password.value;

    if(!username || !password) {
        alert('Username or password is missing!')
    }

    let formBody = {username, password}; 
    fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formBody)
    })
    .then((response) => response.json())
    .then((response) => {
        console.log(response)
    })
})



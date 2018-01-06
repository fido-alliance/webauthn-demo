/**
 * Switch to login page
 */
$('#toLogin').click(function(e) {
    e.preventDefault();
    $('#registerContainer').hide();
    $('#loginContainer').show();
})

/**
 * Switch to registration page
 */
$('#toRegistration').click(function(e) {
    e.preventDefault();
    $('#loginContainer').hide();
    $('#registerContainer').show();
})

// index page
module.exports = function(app, passport) {
    app.get('/', function(req, res) {
        res.render('pages/index', {
            user : req.user
        });
    });

    app.get('/login', function(req, res) {
        res.render('pages/auth/login', { message: req.flash('loginMessage'), user : req.user });
    });

    app.get('/logout', function(req, res) {
        req.logout((err) => {
            if (err) {
              return next(err); // Gestisci eventuali errori
            }
            res.redirect('/');
        });
    });

    app.get('/profile', function(req, res) {
        res.render('pages/index', {
            user : req.user
        });
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', 
        failureRedirect : '/login',
        failureFlash : true
    }));

    app.get('/branche', function(req, res) {
        res.render('pages/publics/branche', {
            user : req.user
        });
    });

    app.get('/story', function(req, res) {
        res.render('pages/publics/story', {
            user : req.user
        });
    });

    app.get('/events', function(req, res) {
        res.render('pages/publics/events', {
            user : req.user
        });
    });

    app.get('/forgot-pass', function(req, res) {
        res.render('pages/auth/forgotPass');
    });

    // about page
    app.get('/about', function(req, res) {
        res.render('pages/about', {
            user : req.user
        });
    });
};
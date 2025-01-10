// load all the things we need
var LocalStrategy = require('passport-local').Strategy;

// load up the user model
var User = require('../models/user');

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(async function(id, done) {
        try {
            // Usa async/await per ottenere l'utente
            const user = await User.findById(id);
            done(null, user); // Se trovato, passa l'utente
        } catch (err) {
            done(err); // Gestisci l'errore se non trovato
        }
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    async function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        try {
            // Cerca un utente nel database con l'email fornita
            const user = await User.findOne({ 'email': email });

            // Se non viene trovato un utente, ritorna un messaggio di errore
            if (!user) {
                return done(null, false, req.flash('loginMessage', 'Utente non trovato.'));
            }

            // Verifica se la password è corretta
            if (!user.validPassword(password)) {
                return done(null, false, req.flash('loginMessage', 'Ops! Password sbagliata.'));
            }

            // Se l'utente è stato trovato e la password è corretta
            return done(null, user);

        } catch (err) {
            return done(err);
        }
    }));
};
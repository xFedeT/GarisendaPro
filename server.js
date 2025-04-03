var express  = require('express');
var app      = express();
require('dotenv').config()

var stripe = require('stripe')(process.env.STRIPE_KEY);
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');



// set the view engine to ejs

mongoose.connect(process.env.DBURL);

require('./backend/login/passport')(passport); // pass passport for configuration

app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(session({
  secret: 'ilovescotchscotchyscotchscotch', // session secret
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());

// use res.render to load up an ejs view file
require('./backend/routes.js')(app, passport, stripe, mongoose);

app.listen(port);
console.log('The magic happens on port ' + port);
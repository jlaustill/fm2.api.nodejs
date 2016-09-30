/**
 * Created by Joshua.Austill on 6/2/2016.
 */
var express = require("express");
var app = express();
//var assert = require("assert");
var cors = require("cors");
var bodyParser = require("body-parser");
var session = require("express-session");
// var passport = require("passport");
// var environment = require("./environment");
var path = require("path");

// global variable for the running directory, why isn't this a thing??
global.__appRoot = path.normalize(__dirname);

// var whitelist = [environment.afterLoginLink, 'http://north40net.csww.lan', 'http://localhost', "http://localhost:63342", "http://localhost:60687"];

var corsOptions = {
    origin: function (origin, callback) {
        "use strict";
        // var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, true);
    },
    credentials: true
};
app.use(cors(corsOptions));

// require("./config/passport")(passport);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(session(
//     {
//         resave: true,
//         saveUninitialized: true,
//         secret: 'fm2 rocks'
//     }
// ));
// app.use(passport.initialize());
// app.use(passport.session());
app.use(require('./routers'));

app.use(function (req, res) {
    "use strict";
    res.sendStatus(404);
});

var server = app.listen(3000, function () {
    "use strict";
    var port = server.address().port;
    console.log("fm2.api.nodejs server listening on port %s.", port);
});
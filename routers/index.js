var express = require('express');
var router = express.Router();
// var environment = require("../environment");
var assert = require("assert");

router.use('/filemanager', require('./filemanager')());


router.get("/", function (req, res) {
    "use strict";
    res.json({"request": "successful", "version": "0.0.1"});
});

module.exports = router;
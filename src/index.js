var express = require("express");
var router = express.Router();
var config = require("./fm2.api.config.json");
// var environment = require("../environment");
// var assert = require("assert");

router.use("/filemanager", require("./filemanager")(config));


router.get("/", function (req, res) {
    "use strict";
    res.json({"request": "successful", "version": "0.0.1"});
});

module.exports = router;
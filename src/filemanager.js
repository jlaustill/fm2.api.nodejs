/**
 * Created by Joshua.Austill on 8/11/2016.

 This connector is actually an api, so you can use it on a separate server from your ui.  However, because of this, it will require
 a bit more setup than your average connector.

 Firstly, you will need a global variable for the application root, why this isn't a standard Node.js variable is seriously
 beyond me.  Just copy and paste this into your app.js, or whatever file you use for your root

 global.__appRoot = path.normalize(__dirname);

 Also, ensure you are requiring path in that file.

 Second, you will need to add path-posix to your project, just run

 npm install --save path-posix

 And you should be good to go there.  I named it paths instead of path in this file because fm2 is passing in a path variable
 and I wanted to keep them as clear as possible.

 Next, you will need to set your settings in fm2.api.config.json.

 Lastly, you will need to require this file and use it as a route.  My call looks like this

 router.use('/filemanager', require('./filemanager')());

 If you are new to Node.js and express, the first parameter defines the endpoint, and the second the loading of this file.
 */
/*global __appRoot*/


module.exports = function (config) {
    "use strict";

    var express = require("express");
    var router = express.Router();
    var fs = require("fs");
    var paths = require("path");
    var multer  = require("multer");
    var upload = multer({ dest: paths.resolve(__appRoot, config.options.uploadPath)});

    paths.posix = require("path-posix");

    function unauthorized (code) {
        return {
            errors: [
                {
                    status: "403",
                    code: code,
                    title: "Unauthorized Access",
                    detail: "You do not have access to this resource.  If you require access, contact the help desk to request access."
                }
            ]
        };
    } // unauthorized

    function ensureAuthenticated (req, res, next) {
        // First we check to see if passport is enabled, if not, allow access, but log it
        if (req.isAuthenticated === undefined) {
            console.log("I HIGHLY recommend you configure passport and auth :)");
            return next();
        }
        // Otherwise, if user is authenticated in the session, carry on
        if (req.isAuthenticated()) {
            return next();
        }
        // Otherwise return an error
        return res.json({
            errors: [
                {
                    status: "401",
                    title: "Unauthenticated Access",
                    detail: "You must be logged in to access this resource.  If you are unable to login, or don't have a login, contact the help desk to request access."
                }
            ]
        }); // return
    } // ensureAuthenticated

    function ensureAccess (req, path) {
        if (req.isAuthenticated === undefined) {
            console.log("I HIGHLY recommend you configure passport and auth :)");
            return true;
        }
        if (req.isAuthenticated() && req.user.roles === undefined) {
            console.log("I HIGHLY recommend you configure roles for folder access :)");
            return true;
        }
        return req.isAuthenticated() && req.user.roles.indexOf(path.split("/")[1]) !== -1;
    }

    function actionAllowed (action) {
        return (config.security.capabilities.indexOf(action) !== -1);
    }

    // We will handle errors consistently by using a function that returns an error object
    function errors (err) {
        console.log("err -> ", err);
        err = err || {}; // This allows us to call errors and just get a default error
        return {
            errors: [{
                title: err.title || err.code || "Error.",
                code: err.errno || err.code || -1,
                detail: err.Error || err.detail || "An error occurred.",
                status: err.status,
                source: err.syscall || err.source
            }]
        };//return
    }//errors

    // This is a seperate function because branch new files are uploaded and won't have an existing file
    // to get information from
    function parseNewPath (path, callback) {
        var parsedPath = {},
            fileRoot = config.options.fileRoot || "";
        parsedPath.uiPath = path;

        // if the passed in path isn't in the fileRoot path, make it so
        // This should go away and every path should be relative to the fileRoot
        if (path.substring(0, fileRoot.length) !== fileRoot) {
            path = paths.posix.join(fileRoot, path);
        }

        parsedPath.relativePath = paths.posix.normalize(path);
        parsedPath.filename = paths.posix.basename(parsedPath.relativePath);
        parsedPath.osRelativePath = paths.normalize(path);
        parsedPath.osExecutionPath = __appRoot;
        parsedPath.osFullPath = paths.join(parsedPath.osExecutionPath, parsedPath.osRelativePath);
        parsedPath.osFullDirectory = paths.parse(parsedPath.osFullPath).dir;
        callback(parsedPath);
    }//parseNewPath

    // because of windows, we are going to start by parsing out all the needed path information
    // this will include original values, as well as OS specific values
    function parsePath (path, callback) {
        if (path) {
            parseNewPath(path, function (parsedPath) {
                fs.stat(parsedPath.osFullPath, function (err, stats) {
                    if (err) {
                        callback(errors(err));
                        return;
                    }
                    parsedPath.isDirectory = !!stats.isDirectory();
                    parsedPath.stats = stats;
                    callback(null, parsedPath);
                }); //fs.stat
            });//parseNewPath
        } else {
            callback(new errors({
                "code": 404,
                "title": "Path not provided",
                "detail": "You must provide a path parameter, IE ?path=/folder/file.ext",
                "source": "parsePath",
                "status": "error"
            }));
            return false;
        }
        return false;
    }//parsePath

    // This function will create the return object for a file.  This keeps it consistent and
    // adheres to the DRY principle
    function fileInfo (pp, callback) {
        var result = {
            "path": (pp.uiPath),
            "dir": paths.posix.parse(pp.uiPath).dir,
            "directPath": ("/item?path=" + pp.uiPath),
            "preview": ("/item/preview?path=" + pp.uiPath),
            "filename": (pp.filename),
            "fileType": paths.parse(pp.osFullPath).ext.toLowerCase().replace(".", ""),
            "isDirectory": false,
            "thumbnail": "images/fileicons/" + paths.parse(pp.osFullPath).ext.toLowerCase().replace(".", "") + ".png",
            "properties": {
                "dateCreated": pp.stats.birthtime,
                "dateModified": pp.stats.mtime,
                "filemtime": pp.stats.mtime,
                "height": 0,
                "width": 0,
                "size": pp.stats.size
            },
            "title": pp.filename,
            "key": pp.uiPath
        };//result
        callback(result);
    }//fileInfo

    // This function will create the return object for a directory.  This keeps it consistent and
    // adheres to the DRY principle
    function directoryInfo (pp, callback) {
        var result = {
            "path": (pp.uiPath),
            "dir": paths.posix.parse(pp.uiPath).dir,
            "directPath": ("/item?path=" + pp.uiPath),
            "preview": ("/item/preview?path=" + pp.uiPath),
            "filename": (pp.filename),
            "fileType": "dir",
            "isDirectory": true,
            "thumbnail": "images/fileicons/_Open.png",
            "properties": {
                "dateCreated": pp.stats.birthtime,
                "dateModified": pp.stats.mtime,
                "filemtime": pp.stats.mtime,
                "height": 0,
                "width": 0,
                "size": pp.stats.size
            },
            "title": pp.filename,
            "folder": true,
            "key": pp.uiPath
        };//result
        callback(result);
    }//directoryInfo

    // Getting information is different for a file than it is for a directory, so here
    // we make sure we are calling the right function.
    function getinfo (pp, callback) {
        if (pp.isDirectory) {
            directoryInfo(pp, function (result) {
                callback(result);
            });
        } else {
            fileInfo(pp, function (result) {
                callback(result);
            });
        }//if
    }//getinfo

    // Here we get the information for a folder, which is a content listing

    // This function exists merely to capture the index and and pp(parsedPath) information in the for loop
    // otherwise the for loop would finish before our async functions
    function getIndividualFileInfo (pp, files, loopInfo, callback, $index, req) {
        parsePath(paths.posix.join(pp.uiPath, files[$index]), function (err, ipp) {
            if (err) {
                return callback(err);
            } else {
                getinfo(ipp, function (result) {
                    // console.log("config -> ", config.security.allowedFileTypes.indexOf(result.fileType), " and ", result);
                    if ((config.security.allowedFileTypes.indexOf(result.fileType) !== -1 || result.isDirectory) && ensureAccess(req, ipp.uiPath)) {
                        loopInfo.results.push(result);
                    }
                    if ($index + 1 >= loopInfo.total) {
                        return callback(loopInfo.results);
                    }//if
                    return false;
                });//getinfo
            }//if
            return false;
        });//parsePath
    }//getIndividualFileInfo

    function getfolder (pp, callback, req) {
        fs.stat(pp.osFullPath, function (err) {
            if (err) {
                console.log("err -> ", err);
                return callback(errors(err));
            } else {
                fs.readdir(pp.osFullPath, function (err, files) {
                    if (err) {
                        //console.log("err -> ", err);
                        return callback(errors(err));
                    } else {
                        var loopInfo = {
                                results: [],
                                total: files.length
                            },
                            i;

                        if (loopInfo.total === 0) {
                            return callback(loopInfo.results);
                        }

                        for (i = 0; i < loopInfo.total; i++) {
                            getIndividualFileInfo(pp, files, loopInfo, callback, i, req);
                        }//for
                    }//if
                    return false;
                });//fs.readdir
            }//if
            return false;
        });//fs.stat
    }//getinfo

    // function to delete a file/folder
    function deleteItem (pp, callback) {
        getinfo(pp, function (item) {
            if (pp.isDirectory === true) {
                fs.rmdir(pp.osFullPath, function (err) {
                    if (err) {
                        return callback(errors(err));
                    } else {
                        return callback(item);//callback
                    }//if
                });//fs.rmdir
            } else {
                fs.unlink(pp.osFullPath, function (err) {
                    if (err) {
                        return callback(errors(err));
                    } else {
                        return callback(item);//callback
                    }//if
                });//fs.unlink
            }//if
        });
    }//deleteItem

    // function to add a new folder
    function addfolder (pp, name, callback) {
        fs.mkdir(paths.join(pp.osFullPath, name), function (err) {
            if (err) {
                return callback(errors(err));
            } else {
                getinfo(pp, function (ipp) {
                    callback(ipp);//callback
                });
            }//if
            return false;
        });//fs.mkdir
    }//addfolder

    //function to save a replaced file, tried to combine this with save new files, but it
    // just got to complicated
    function replacefile (pp, file, callback) {
        var oldfilename = paths.join(__appRoot, file.path),

            newfilename = paths.join(
                pp.osFullPath
            ); //not sure if this is the best way to handle this or not

        // console.log("replacefile pp -> ", pp, " file -> ", file, " oldfilename -> ", oldfilename, " newfilename -> ", newfilename);

        fs.rename(oldfilename, newfilename, function (err) {
            if (err) {
                console.log("replacefile error -> ", err);
                return callback(errors(err));
            } else {
                return callback({
                    "path": pp.uiPath,
                    "name": pp.isDirectory ? file.originalname : pp.filename
                });//callback
            }//if
        });//fs.rename
    }//replacefile

    function savefile (pp, file, callback) {
        var oldfilename = file.path,

            newfilename = paths.join(
                pp.osExecutionPath,
                pp.osRelativePath,
                file.originalname
            ); //not sure if this is the best way to handle this or not

        // console.log("savefile pp -> ", pp, " file -> ", file, " oldfilename -> ", oldfilename, " newfilename -> ", newfilename);

        fs.rename(oldfilename, newfilename, function (err) {
            if (err) {
                console.log("savefiles error -> ", err);
                return callback(errors(err));
            } else {
                return callback({
                    "path": pp.uiPath,
                    "name": pp.isDirectory ? file.originalname : pp.filename
                });//callback
            }//if
        });//fs.rename
    }//savefile

    // function to rename files
    function rename (old, newish, callback) {
        fs.rename(old.osFullPath, newish.osFullPath, function (err) {
            if (err) {
                return callback(errors(err));
            } else {
                parsePath(newish.uiPath, function (err, pp) {
                    if (err) {
                        return callback(err);
                    } else {
                        getinfo(pp, function (ipp) {
                            callback(ipp);
                        });//getinfo
                    } //if
                    return false;
                });//parsePath
            }//if
            return false;
        }); //fs.rename
    }//rename

    function respond (res, obj) {
        if (obj.errors) {
            console.log("respond err -> ", obj);
            res.json(obj);
        } else {
            // console.log(JSON.stringify(obj));
            res.json({data: obj});
        }
    }//respond

    /* ****************************************************
     New routes 2.0
     ****************************************************
     */

    // This route will return the servers rules to the ui
    // Access: authenticated only
    router.route("/")
        .get(ensureAuthenticated, function (req, res) {
            res.json({
                data: [{
                    security: {
                        capabilities: config.security.capabilities,
                        allowedFileTypes: config.security.allowedFileTypes
                    }
                }]
            }); // res.json
        }); // route "/"

    // This endpoint will deal with specific files
    router.route("/file")
    // This route saves a new file
    // Access: Authenticated, allowed and folder access
        .post(ensureAuthenticated, upload.single("file"), function (req, res) {
            parsePath(req.body.path, function (err, pp) {
                if (err) {
                    respond(res, err);
                } else {
                    if (actionAllowed("upload") && ensureAccess(req, req.body.path)) {
                        savefile(pp, req.file, function (result) {
                            respond(res, result);
                        }); // savefiles
                    } else {
                        respond(res, unauthorized(req.body.path));
                    } //if allowed
                } // if err
            }); //parsePath
        })//post
        // This route replaces a file, it uses the replace name so no changing of extensions is permitted
        // Access: Authenticated, allowed, and folder access
        .put(ensureAuthenticated, upload.single("file"), function (req, res) {
            if (actionAllowed("replace") && ensureAccess(req, req.body.path)) {
                parsePath(req.body.path, function (err, pp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        replacefile(pp, req.file, function (result) {
                            respond(res, result);
                        }); //savefiles
                    } //if err
                });//parsePath
            } else {
                respond(res, unauthorized(req.body.path));
            } //if allowed
        }); //put

    // This endpoint accepts actions on "items", this can be either a file OR a folder
    router.route("/item")
    // This route will download the item, currently only handling files
    // Access: Authenticated and folder access, in future I need to seperate preview and download to enforce download at the api level
        .get(ensureAuthenticated, function (req, res) {
            if (ensureAccess(req, req.query.path)) {
                parsePath(req.query.path, function (err, pp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        res.setHeader("content-disposition", "attachment; filename=" + pp.filename);
                        res.setHeader("content-type", "application/octet-stream");
                        res.sendFile(pp.osFullPath);
                    } // if err
                }); //parsePath
            } else {
                respond(res, unauthorized(req.query.path));
            } //if allowed
        }) //get
        // This action will move an item
        // Access: Authenticated, action allowed, and folder access
        .patch(ensureAuthenticated, function (req, res) {
            if (actionAllowed("move") && ensureAccess(req, req.query.newPath)) {
                parsePath(req.query.path, function (err, opp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        parseNewPath(paths.posix.join("/", req.query.newPath, opp.filename), function (npp) {
                            rename(opp, npp, function (result) {
                                respond(res, result);
                            }); //rename
                        }); //parseNewPath
                    } //if
                }); //parsePath
            } else {
                respond(res, unauthorized(req.query.newPath));
            } //if allowed
        }) //patch
        // This action will delete the item
        // Access: Authenticated, action allowed, and folder access
        .delete(ensureAuthenticated, function (req, res) {
            if (actionAllowed("delete") && ensureAccess(req, req.query.path)) {
                parsePath(req.query.path, function (err, pp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        deleteItem(pp, function (result) {
                            respond(res, result);
                        }); //parsePath
                    } //if
                }); //parsePath
            } else {
                respond(res, unauthorized(req.query.path));
            } //if allowed
        }); // route: /item

    // This endpoint deal with meta information about the item
    router.route("/item/meta")
    // The action just gets the meta data
    // Access: Authenticated and folder access
        .get(ensureAuthenticated, function (req, res) {
            if (ensureAccess(req, req.query.path)) {
                parsePath(req.query.path, function (err, pp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        getinfo(pp, function (result) {
                            respond(res, result);
                        }); //getinfo
                    } // if err
                }); //parsePath
            } else {
                respond(res, unauthorized(req.query.path));
            } //if allowed
        }); // /item/meta

    // This endpoind deals specifically with an items name
    router.route("/item/meta/name")
    // This action will rename the item, it will not allow moving or changing the extension
    // Access: Authenticated, action allowed, and folder access
        .put(ensureAuthenticated, function (req, res) {
            if (actionAllowed("rename") && ensureAccess(req, req.query.path)) {
                parsePath(req.query.path, function (err, opp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        // We want to make sure people don't move files with relative renames, such as ../newname.ext
                        // or change extensions, so we will parse out just the name from the new string, and reuse
                        // the directory and extension from the old name
                        var newPath = paths.posix.parse(opp.uiPath).dir,
                            newish = paths.posix.join(newPath, paths.posix.parse(req.query.new).name + paths.posix.parse(opp.uiPath).ext);

                        parseNewPath(newish, function (npp) {
                            rename(opp, npp, function (result) {
                                respond(res, result);
                            }); //rename
                        }); //parseNewPath
                    } // if err
                }); //parsePath
            } else {
                respond(res, unauthorized(req.query.path));
            } //if allowed
        }); // route /item/meta/name

    // For now this is just returning the entire file.  In future, it will need to handle creating thumbnails
    // and whatever is appropiate
    router.route("/item/preview")
    // This action just downloads the preview
    // Access: Wide open for embedding with tinymce etc etc
        .get(function (req, res) {
            parsePath(req.query.path, function (err, pp) {
                if (err) {
                    respond(res, err);
                } else {
                    res.setHeader("content-disposition", "attachment; filename=" + pp.filename);
                    res.setHeader("content-type", "application/octet-stream");
                    res.sendFile(pp.osFullPath);
                } // if err
            }); //parsePath
        }); // route: /item/preview

    // This endpoint will deal with folders specifically
    router.route("/folder")
    // This action will get the folders contents as an array, also could be called a directory listing
    // Access: Authenticated and folder access
        .get(ensureAuthenticated, function (req, res) {
            if (ensureAccess(req, req.query.path)) {
                parsePath(req.query.path, function (err, pp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        getfolder(pp, function (result) {
                            respond(res, result);
                        }, req); //getfolder
                    } // if err
                }); //parsePath
            } else {
                respond(res, unauthorized(req.query.path));
            } //if allowed
        }) //get
        // This action will create a new folder
        // Access: Authenticated and folder access
        .post(ensureAuthenticated, function (req, res) {
            if (ensureAccess(req, req.query.path)) {
                parsePath(req.query.path, function (err, pp) {
                    if (err) {
                        respond(res, err);
                    } else {
                        addfolder(pp, req.query.name, function (result) {
                            respond(res, result);
                        }); //addfolder
                    } // if err
                }); //parsePath
            } else {
                respond(res, unauthorized(req.query.path));
            } //if allowed
        }); //router /folder

    return router;
}; //module.exports

## fm2.api.nodejs
fm2.api.nodejs holds the Node.js api router for use with [fm2](https://github.com/jlaustill/fm2).  It isn't very useful by itself as it simply provides the backend services for the filemanager.  If this doesn't make any sense to you, check out the fm2 repo.

## Installation
Installation is easy with npm, from the root of your Node.js project, run

```
npm install fm2.api.nodejs
```

It will install into

```
./node_modules/fm2.api.nodejs/
```

## Configuration
You'll need to edit the /dist/fm2.api.config.json file and give it your settings, the options are as follows.

1. options.fileroot => the folder files will be saved to and retrieved from, can be anywhere on your server
2. security.capabilities => which actions to allow, the client first asks for the servers rules, these are those rules.  If you don't want to allow uploading, remove upload.  Etc etc.
3. security.allowedFileTypes => This are the only file extensions the filemanager will allow, it will ignore anything else and not allow uploads outside this list.

You will need a global variable for the application root, why this isn't a standard Node.js variable is seriously beyond me.  Just copy and paste this into your app.js, or whatever file you use for your root

```
global.__appRoot = path.normalize(__dirname);
```

And install path with, 

```
npm install --save path
```

Next, you will need to add path-posix to your project, just run

```
npm install --save path-posix
```

Finally, you will need to require /dist/filemanager.js and use it as a route. My call looks like this

```
router.use('/filemanager', require('./node_modules/fm1.api.nodejs/dist/filemanager')());
```


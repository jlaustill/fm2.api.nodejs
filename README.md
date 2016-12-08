## fm2.api.nodejs
fm2.api.nodejs holds the Node.js api router for use with [jlaustill/fm2](https://github.com/jlaustill/fm2).  It isn't very useful by itself as it simply provides the backend services for the filemanager.  If this doesn't make any sense to you, check out the fm2 repo.

## Installation
Installation is easy with npm, from the root of your Node.js project, run

```
npm install -S fm2.api.nodejs
```

It will install into

```
./node_modules/fm2.api.nodejs/
```

## Configuration
You'll need to save a copy of the /dist/fm2.api.config.default.json file somewhere and give it your settings, the options are as follows.

1. options.fileroot => the folder files will be saved to and retrieved from, can be anywhere on your server, relative to appRoot of your Node.js app.
2. options.uploadPath => the folder uploads will be saved to when they are uploaded.  This is a temp folder, and can be anywhere on your server, relative to appRoot of your Node.js app.
3. security.capabilities => which actions to allow, the client first asks for the servers rules, these are those rules.  If you don't want to allow uploading, remove upload.  Etc etc.
4. security.allowedFileTypes => These are the only file extensions the filemanager will allow, it will ignore anything else and not allow uploads outside this list.

You will need a global variable for the application root, why this isn't a standard Node.js variable is seriously beyond me.  Just copy and paste this into your app.js, or whatever file you use for your root

```
global.__appRoot = path.normalize(__dirname);
```

And install path with, 

```
npm install --S path
```

Next, you will need to add path-posix to your project, just run

```
npm install --S path-posix
```

Finally, you will need to require /dist/filemanager.js and use it as a route.  You need to pass in the copy of the config file as a parameter. My call looks like this

```
router.use('/filemanager', require('./node_modules/fm2.api.nodejs/dist/filemanager')(require('../config/fm2.api.config.json'));
```

## Security
fm2.api.nodejs uses [Passport.js](http://passportjs.org/) for security.  If you have it configured, it will be detected and used.  If you don't, it won't and security and be wide open: I do NOT recommend this...

It does two things, first, it ensures the user is authenticated for every endpoint.  If they are not, it will return an error object and provide the user with a toastr alert.

Second, it ensures that only folders matching the users roles are provided.  It assumes that req.user.roles is an array of roles, if it's not, you'll need to copy your roles to that location.  This is a bit tough to explain, so I'll give an example.  Imagine your user has these roles

```javascript
console.log(req.user.roles);
=> ["admin", "user", "finance"]
```

And the directory your fileroot is pointing to has the following folders

```
/
/admin
/user
/marketing
/finance
```

The user will only see the folders at the root level that match his/her roles, so marketing won't even show up.  You can use this to have files only seen by your user groups, however you set them up.  I use them for departments as shown

## Contributing
I welcome any and all contributions!  This is a pretty large project, and so far I've done it all by myself.  If you have idea's, bug reports, documentation suggestions, or anything else useful open a bug report and lets hear them!

To hack on the code, just fork and clone the entire repo.  I have it set up as a runnable app, so you should be able to just run it and start hacking.

## License
License: [MIT](http://www.opensource.org/licenses/mit-license.php)

## Contact
[Joshua Austill](https://jlaustill.github.io)

Find me on my blog, there's links to my twitter etc etc.

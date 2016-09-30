/* File: gulpfile.js */

// grab our gulp packages
var gulp = require("gulp"),
    gutil = require("gulp-util"),
    eslint = require("gulp-eslint");
// console.log("_ -> ", _);

gulp.task("static", function () {
    "use strict";
    return gulp.src([
        "./src/filemanager.js",
        "./src/fm2.api.config.json"
    ])
        .pipe(gulp.dest("./dist"));
});

gulp.task("lint", function () {
    "use strict";
    // ESLint ignores files with "node_modules" paths.
    // So, it's best to have gulp ignore the directory as well.
    // Also, Be sure to return the stream from the task;
    // Otherwise, the task may end before the stream has finished.
    return gulp.src(["src/*.js", "!node_modules/**"])
    // eslint() attaches the lint output to the "eslint" property
    // of the file object so it can be used by other modules.
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failAfterError last.
        .pipe(eslint.failAfterError());
});

// create a default task and just log a message
gulp.task("default", ["lint", "static"], function () {
    "use strict";
    return gutil.log("Gulp is running!");
});
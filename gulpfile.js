/**
 * Created by jacksay on 13/01/16.
 */
var gulp = require('gulp'),
    sass = require('gulp-sass'),
    jshint = require('gulp-jshint'),
    server = require('gulp-server-livereload'),
    paths = {
        sass: 'src/styles/',
        js: 'src/js/'
    }
    ;

// SASS
gulp.task('sass', function(){
    gulp.src(paths.sass +'*.scss')
        .pipe(sass())
        .pipe(gulp.dest(path.sass));
});

gulp.task('sass:watch', function(){
    gulp.watch(paths.sass +'*.scss', ['sass']);
});


// JSHINT
gulp.task('jshint', function(){
    gulp.src(paths.js +'*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});
gulp.task('jshint:watch', function(){
    gulp.watch(paths.js +'*.js', ['jshint']);
});


// LIVE SERVER

gulp.task('webserver', function() {
    gulp.src('src')
        .pipe(server({
            livereload: false,
            directoryListing: true,
            open: true
        }));
});
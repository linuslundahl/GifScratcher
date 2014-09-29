var gulp       = require('gulp'),
    clean      = require('gulp-clean'),
    compass    = require('gulp-compass'),
    // concat     = require('gulp-concat'),
    jshint     = require('gulp-jshint'),
    livereload = require('gulp-livereload'),
    minifycss  = require('gulp-minify-css'),
    notify     = require('gulp-notify'),
    path       = require('path'),
    prefix     = require('gulp-autoprefixer'),
    plumber    = require('gulp-plumber'),
    rename     = require('gulp-rename'),
    sass       = require('gulp-ruby-sass'),
    uglify     = require('gulp-uglify');

gulp.task('default', function() {
  livereload.listen();

  // Watch .scss files
  gulp.watch('sass/**/*.scss', ['compass']).on('change', livereload.changed);

  // Watch .js files
  gulp.watch(['javascripts/**/*.js', '!javascripts/**/*.min.js'], ['scripts']).on('change', livereload.changed);
});

// The title and icon that will be used for the notifications
var notifyInfo = {
  title: 'Gulp',
  icon: path.join(__dirname, 'gulp.png')
};

// Error notification settings for plumber
var plumberErrorHandler = { errorHandler: notify.onError({
    title: notifyInfo.title,
    icon: notifyInfo.icon,
    message: "Error: <%= error.message %>"
  })
};

// SASS
gulp.task('compass', function() {
  return gulp.src('sass/**/*.scss')
    .pipe(plumber(plumberErrorHandler))
    .pipe(compass({
      config_file: 'config.rb',
      css: 'stylesheets',
      sass: 'sass',
      sourcemap: false
    }))
    .pipe(prefix('> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1'))
    .pipe(gulp.dest('stylesheets'));
    // .pipe(rename({ suffix: '.min' }))
    // .pipe(minifycss())
    // .pipe(gulp.dest('stylesheets'));
});

// Scripts
gulp.task('scripts', function() {
  return gulp.src(['javascripts/*.js', '!javascripts/*.min.js'])
    .pipe(plumber(plumberErrorHandler))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify({
      preserveComments : 'some'
    }))
    .pipe(gulp.dest('javascripts'))
    .pipe(notify({ message: 'Scripts task complete' }));
});

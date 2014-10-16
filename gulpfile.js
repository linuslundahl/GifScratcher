var gulp = require('gulp'),
    $    = require('gulp-load-plugins')();

var handleError = function (err) {
  $.notify.onError()(err);
  this.emit('end');
};

gulp.task('default', function() {
  $.livereload.listen();

  // Watch .scss files
  gulp.watch('sass/**/*.scss', ['compass']).on('change', $.livereload.changed);

  // Watch .js files
  gulp.watch(['javascripts/**/*.js', '!javascripts/**/*.min.js'], ['scripts']).on('change', $.livereload.changed);
});

// SASS
gulp.task('compass', function() {
  return gulp.src('sass/**/*.scss')
    .pipe($.rubySass({
      compass : true
    }).on('error', handleError))
    .pipe($.autoprefixer('> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1'))
    .pipe(gulp.dest('stylesheets'));
});

// Scripts
gulp.task('scripts', function() {
  return gulp.src(['javascripts/*.js', '!javascripts/*.min.js'])
    .pipe($.rename({ suffix: '.min' }))
    .pipe($.uglify({
      preserveComments : 'some'
    }))
    .pipe(gulp.dest('javascripts'))
    .pipe($.notify({ message: 'Scripts task complete' }));
});

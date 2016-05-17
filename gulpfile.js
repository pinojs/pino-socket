'use strict';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const srcIncludes = [
  '**/*.js',
  '!node_modules/**',
  '!coverage/**',
  '!test/**' // tests can be wonky
];

gulp.task('lint', function lintTask() {
  return gulp
    .src(srcIncludes)
    .pipe($.eslint())
    .pipe($.eslint.formatEach())
    .pipe($.eslint.failAfterError());
});

gulp.task('pre-test', function preTest() {
  return gulp
    .src(srcIncludes)
    .pipe($.istanbul())
    .pipe($.istanbul.hookRequire());
});

gulp.task('test', ['lint', 'pre-test'], function testTask() {
  return gulp
    .src(['test/*.js'])
    .pipe($.mocha({ui: 'qunit', reporter: 'min'}))
    .pipe($.istanbul.writeReports());
});

gulp.task('default', ['test']);

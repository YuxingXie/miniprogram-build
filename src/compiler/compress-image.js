///@ts-check
'use strict';
var gulp = require('gulp');
var imagemin = require('../lib/image-min');
var err = require('../log/error');
const size = require('../log/size');

var TITLE = 'image';
/**
 * 
 * @param {string|string[]} imgsrc
 * @param {string} dist 
 * @param {{base:string,ignore?:any}} opt
 * 
 */
function compressImage(imgsrc, dist, opt) {
    return gulp.src(imgsrc, opt)
        // .pipe(debug({ title: 'image:' }))
        .pipe(imagemin({ verbose: true }))
        .on('error', err(TITLE))
        .pipe(gulp.dest(dist))
        .pipe(size({ title: TITLE, showFiles: false }));

}


module.exports = compressImage
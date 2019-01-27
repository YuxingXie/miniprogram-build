///@ts-check
'use strict';
var gulp = require('gulp');
var debug = require('gulp-debug');

/**
 * NPM创建 符号链接
 * 文件在windows需要管理员权限，所以package.json 为拷贝
 */
function link(config) {
    return [
        gulp.src('package.json')
            ///@ts-ignore
            .pipe(debug({ title: 'copy', showCount: false }))
            .pipe(gulp.dest(config.dist)),
        gulp.src(['./node_modules'], { resolveSymlinks: false })
            ///@ts-ignore
            .pipe(debug({ title: 'link', showCount: false }))
            .pipe(gulp.symlink(config.dist)),
    ];
}
module.exports = link;

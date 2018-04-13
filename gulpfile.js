var gulp = require("gulp");
var babel = require("gulp-babel");
var sourcemaps = require('gulp-sourcemaps');
require("babel-core").buildExternalHelpers();
gulp.task("default", function () {
    return gulp.src("src/**/*.js").pipe(babel({ presets: 'env',
    plugins:[ 
    "transform-class-properties",
    "transform-export-extensions"
    ]})).pipe(gulp.dest("test")); //转换成 ES5 存放的路径
});

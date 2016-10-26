'use strict';

const gulp = require('gulp');
const pug = require('gulp-pug');
//const concat = require('gulp-concat');
const postcss = require('gulp-postcss');
const use = require('postcss-use');
const postcss_nested = require('postcss-nested');
const postcss_bem = require('postcss-bem');
const precss = require('precss');
const lost = require('lost');
const cssnext = require('postcss-cssnext');
const postcss_autoreset = require('postcss-autoreset');
const postcss_pxtorem = require('postcss-pxtorem');
const postcss_focus = require('postcss-focus');
//const nano = require('cssnano');
const postcssassets = require('postcss-assets');
const flexbugs = require('postcss-flexbugs-fixes');
const postcss_sorting = require('postcss-sorting');
const sourcemaps = require('gulp-sourcemaps');
const notify = require('gulp-notify');
const combiner = require('stream-combiner2').obj;
const browserSync = require('browser-sync').create();
const reload = browserSync.reload;
//const debug = require('gulp-debug');
const gulpif = require('gulp-if');
const filter = require('gulp-filter');
const pugInheritance = require('yellfy-pug-inheritance');
const del = require('del');

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

let pugPages = ['./frontend/pug/*.pug'];

let pugInheritanceCache = {};

gulp.task('watch', () => {
	global.watch = true;

	gulp.watch(['./frontend/pug/**/*.pug'], gulp.series('pug'))
		.on('all', (event, filepath) => {
			global.changedTempalteFile = filepath.replace(/\\/g, '/');
		});
	gulp.watch('./frontend/css/*.css', gulp.series('css'));
});

function pugFilter(file, inheritance) {
	const filepath = `./frontend/pug/${file.relative}`;
	if (inheritance.checkDependency(filepath, global.changedTempalteFile)) {
		console.log(`Compiling: ${filepath}`);
		return true;
	}

	return false;
}

gulp.task('pug', () => {
	const changedFile = global.changedTempalteFile;
	const options = {
		changedFile,
		treeCache: pugInheritanceCache
	};

	return pugInheritance.updateTree('./frontend/pug/', options).then((inheritance) => {
		// Save cache for secondary compilations
		pugInheritanceCache = inheritance.tree;
		return combiner(
			gulpif(global.watch, filter((file) => pugFilter(file, inheritance))),
			gulp.src(pugPages),
			gulpif(isDevelopment, sourcemaps.init()),
			pug({
				pretty: '\t'
			}),
			gulpif(isDevelopment, sourcemaps.write('./')),
			gulp.dest('./public/')
		).on('error', notify.onError());
	});
});

gulp.task('css-norm', () => {
	let processors = [
		use({
			modules: 'postcss-normalize'
		})
	];

	return combiner(
		gulp.src('./frontend/css/normalize.css'),
		postcss(processors),
		gulp.dest('./public/css/')
	).on('error', notify.onError());

});

gulp.task('css', () => {
	let processors = [
		precss(),
		postcss_bem({
			style: 'bem'
		}),
		postcss_nested(),
		cssnext({
			features: {
				autoprefixer: {
					browsers: ['last 5 versions'],
					cascade: false
				}
			}
		}),
		lost(),
		postcss_pxtorem({
			replace: true
		}),
		postcssassets({
			loadPaths: ['./public/images'],
			relativeTo: './public/css'
		}),
		postcss_autoreset({
			reset: {
				margin: 0,
				padding: 0,
				borderRadius: 0
			},
			rulesMatcher: 'bem'
		}),
		postcss_focus(),
		flexbugs(),
		postcss_sorting({
			'sort-order': 'csscomb'
		})
	];

	return combiner(
		gulp.src('./frontend/css/style.css'),
		gulpif(isDevelopment, sourcemaps.init()),
		postcss(processors),
		gulpif(isDevelopment, sourcemaps.write('./')),
		gulp.dest('./public/css/')
	).on('error', notify.onError());

});

gulp.task('clean', function() {
	return del('public/**/*.*');
});

gulp.task('assets', function() {
	return gulp.src('frontend/assets/**', {
		since: gulp.lastRun('assets')
	})
		.pipe(gulp.dest('public'));
});

gulp.task('serve', () => {
	browserSync.init({
		server: {
			baseDir: './public'
		}
	});
	browserSync.watch('public/**/*.*', 'public/**/**/*.*').on('change', reload);
});

gulp.task('default', gulp.parallel('watch', 'serve'));

gulp.task('build', gulp.series(
	'clean',
	gulp.parallel('css', 'pug', 'assets', 'css-norm')));

gulp.task('dev',
	gulp.series('build', gulp.parallel('watch', 'serve'))
);

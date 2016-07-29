import gulp from 'gulp'
import gulpLoadPlugins from 'gulp-load-plugins'
import runSequence from 'run-sequence'
import {
	dirname
} from 'path'
import {
	parseString
} from 'xml2js'
import {
	spawn
} from 'child_process'
import {
	obj
} from 'through2'

const nodeKillProcessesCmd = ['killall', 'node']
const iosStartCmd = ['ti', 'build', '-p', 'ios', '-t', 'simulator', '--tall', '--retina', '--debug-host',
	'localhost:8999', '--quiet'
]
const iosKillCmd = ['killall', 'iOS Simulator']
const tiInspectorCmd = ['ti-inspector']
const rootPath = './'
const appAndNestedDirectoriesPath = 'app/**'
const jsAppFilesPath = `${appAndNestedDirectoriesPath}/*.js`
const xmlFilesPath = ['tiapp.xml', 'app/views/**/*.xml', 'app/i18n/**/*.xml']
const prettifyFilesPath = `${appAndNestedDirectoriesPath}/*.+(js|xml|tss)`

const jsbeautifierOptions = {
	js: {
		file_types: ['.js', '.json', '.tss'],
	},
	html: {
		file_types: ['.xml'],
	},
}

const $ = gulpLoadPlugins({
	pattern: ['gulp-*', 'gulp.*'],
	replaceString: /^gulp(-|\.)/,
})

const spawnProcess = (_cmd, _cb) => {
	const [cmd, ...args] = _cmd
	const buffer = spawn(cmd, args, {
		stdio: 'ignore',
	})
	buffer.on('close', _code => !/^killall$/i.test(cmd) && console.log(
		`${cmd} has finished with the following status code: ${_code}`))
	_cb()
}

const validateXML = () => obj(({
	contents,
	isNull,
	isStream
}, _enc, _cb) => {
	if (isNull()) {
		_cb(null)
		return
	}
	if (isStream()) {
		_cb(new Error(PLUGIN_NAME, 'Streaming not supported'))
		return
	}
	parseString(contents.toString('utf8'), (_err, _result) => _cb(_err ? new Error(_err) : null))
})

gulp.task('jscs', () => gulp
	.src(jsAppFilesPath)
	.pipe($.jscs())
	.pipe($.jscsStylish.combineWithHintResults())
	.pipe($.jshint.reporter('jshint-stylish')))

gulp.task('prettify', () => gulp
	.src(prettifyFilesPath)
	.pipe($.jsbeautifier(jsbeautifierOptions))
	.pipe($.jsbeautifier.reporter())
	.pipe(gulp.dest('./app/')))

gulp.task('validateXML', () => gulp
	.src(xmlFilesPath)
	.pipe(validateXML()))

gulp.task('watch', () => {
	gulp.watch(`${appAndNestedDirectoriesPath}/*.+(js|tss|xml|json)`, ['ios:start'])
	gulp.watch(xmlFilesPath, ['validateXML'])
	gulp.watch(jsAppFilesPath, ['jscs'])
})

gulp.task('node:kill-processes', spawnProcess.bind(null, nodeKillProcessesCmd))
gulp.task('ti-inspector:start', spawnProcess.bind(null, tiInspectorCmd))
gulp.task('ios:kill', spawnProcess.bind(null, iosKillCmd))
gulp.task('ios:start', ['ios:kill'], spawnProcess.bind(null, iosStartCmd))
gulp.task('start:dev', _cb => runSequence('node:kill-processes', 'validateXML', 'prettify', 'ti-inspector:start',
	'ios:start',
	'watch', _cb))
gulp.task('default', _cb => runSequence('validateXML', 'prettify', 'ios:start', _cb))

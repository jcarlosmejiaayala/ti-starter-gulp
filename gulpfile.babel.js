import gulp from 'gulp'
import gulpLoadPlugins from 'gulp-load-plugins'
import runSequence from 'run-sequence'
import minimist from 'minimist'
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

const {
	ui,
	production: isProd,
	clean: shouldClean,
} = minimist(process.argv.slice(2))
const tiCleanProject = ['ti', 'clean']
const nodeKillProcessesCmd = ['killall', 'node']
const iosStartCmd = ['ti', 'build', '-p', 'ios', '--tall', '--retina', '--debug-host',
	'localhost:8999', '--quiet'
]
const iosStartUICmd = ['ti', 'build', '-p', 'ios', '--faster']
const iosKillCmd = ['killall', 'iOS Simulator']
const tiInspectorCmd = ['ti-inspector']
const startDevCommonsCmd = [
	['node:kill-processes'].concat(shouldClean ? 'ti:clean': []), 'validateXML', 'prettify'
]
const startDevCmd = ['ti-inspector:start', 'ios:start']
const startDevUICmd = ['ios:start-ui']
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
	contents: _contents,
	isNull: _isNull,
	isStream: _isStream
}, _enc, _cb) => {
	if (_isNull()) {
		_cb(null)
		return
	}
	if (_isStream()) {
		_cb(new Error('Streaming not supported'))
		return
	}
	parseString(_contents.toString('utf8'), (_err, _result) => _cb(_err ? new Error(_err) : null))
})

gulp.task('jscs', () => gulp
	.src(jsAppFilesPath)
	.pipe($.jscs())
	.pipe($.jscsStylish.combineWithHintResults())
	.pipe($.jshint.reporter('jshint-stylish')))

gulp.task('prettify', () => gulp
	.src(prettifyFilesPath)
	.pipe($.jsbeautifier(jsbeautifierOptions))
	.pipe($.if(isProd, $.jsbeautifier.reporter()))
	.pipe(gulp.dest('./app/')))

gulp.task('validateXML', () => gulp
	.src(xmlFilesPath)
	.pipe(validateXML()))

gulp.task('watch', () => {
	if (!ui) {
		gulp.watch(`${appAndNestedDirectoriesPath}/*.+(js|tss|xml|json)`, ['ios:start'])
	}
	gulp.watch(xmlFilesPath, ['validateXML'])
	gulp.watch(jsAppFilesPath, ['jscs'])
})
gulp.task('ti:clean', spawnProcess.bind(null, tiCleanProject))
gulp.task('node:kill-processes', spawnProcess.bind(null, nodeKillProcessesCmd))
gulp.task('ti-inspector:start', spawnProcess.bind(null, tiInspectorCmd))
gulp.task('ios:kill', spawnProcess.bind(null, iosKillCmd))
gulp.task('ios:start', ['ios:kill'], spawnProcess.bind(null, iosStartCmd))
gulp.task('ios:start-ui', spawnProcess.bind(null, iosStartUICmd))
gulp.task('start', _cb => runSequence(...startDevCommonsCmd, ...(ui ? startDevUICmd : startDevCmd), 'watch', _cb))
gulp.task('default', _cb => runSequence('ti:clean', 'validateXML', 'prettify', 'ios:start', _cb))

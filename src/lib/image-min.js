
///@ts-check
"use strict";
const fs = require('fs');
const path = require('path');
const through = require('through2');
const PluginError = require('../lib/error');
const prettyBytes = require('./pretty-bytes');
const chalk = require('ansi-colors');
const imagemin = require('imagemin');
const log = require('../log/logger');
const color = require('../log/color');

const PLUGIN_NAME = 'image';
const defaultPlugins = ['gifsicle', 'jpegtran', 'optipng', 'svgo'];

function loadDefaultSvgoConfig() {
	const yaml = require('js-yaml');
	const FILE = '.svgo.yml';
	if (fs.existsSync(FILE)) {
		return yaml.safeLoad(fs.readFileSync(FILE, 'utf8'));
	}
	return undefined
}
const loadPlugin = (plugin, ...args) => {
	try {
		const pluginModule = require(`imagemin-${plugin}`);
		var svgconfig;
		if (plugin === "svgo" && (svgconfig = loadDefaultSvgoConfig())) {
			const config = args[0] || {};
			const svgplugins = svgconfig.plugins || [];
			return pluginModule(Object.assign({}, svgconfig, config, {
				plugins: svgplugins.concat(config.plugins || [])
			}))
		}
		return pluginModule(...args);

	} catch (error) {
		log.error(`${PLUGIN_NAME}: Couldn't load default plugin "${plugin}"`);
	}
};

const exposePlugin = plugin => (...args) => loadPlugin(plugin, ...args);

const getDefaultPlugins = () =>
	defaultPlugins.reduce((plugins, plugin) => {
		const instance = loadPlugin(plugin);

		if (!instance) {
			return plugins;
		}

		return plugins.concat(instance);
	}, []);


module.exports = (plugins, options) => {
	if (typeof plugins === 'object' && !Array.isArray(plugins)) {
		options = plugins;
		plugins = null;
	}

	options = Object.assign({
		// TODO: Remove this when Gulp gets a real logger with levels
		verbose: process.argv.includes('--verbose')
	}, options);

	const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];

	let totalBytes = 0;
	let totalSavedBytes = 0;

	return through.obj(
		// 	{
		// 	maxConcurrency: 8
		// },
		(file, enc, cb) => {
			if (file.isNull()) {
				cb(null, file);
				return;
			}

			if (file.isStream()) {
				cb(new PluginError(PLUGIN_NAME, 'Streaming not supported'));
				return;
			}

			if (!validExts.includes(path.extname(file.path).toLowerCase())) {
				if (options.verbose) {
					log(`${PLUGIN_NAME}: Skipping unsupported image ${chalk.blue(file.relative)}`);
				}

				cb(null, file);
				return;
			}

			const use = plugins || getDefaultPlugins();

			imagemin.buffer(file.contents, { plugins: use })
				.then(data => {
					const originalSize = file.contents.length;
					const optimizedSize = data.length;
					const saved = originalSize - optimizedSize;
					const percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
					const savedMsg = `saved ${prettyBytes(saved)} - ${percent.toFixed(1).replace(/\.0$/, '')}%`;
					const msg = saved > 0 ? savedMsg : 'already optimized';

					if (saved > 0) {
						totalBytes += originalSize;
						totalSavedBytes += saved;
					}

					if (options.verbose) {
						log(color(`${PLUGIN_NAME}`), chalk.symbols.check, chalk.underline(file.relative), chalk.gray(` (${msg})`));
					}

					file.contents = data;
					cb(null, file);
				})
				.catch(error => {
					cb(new PluginError(PLUGIN_NAME, error, { fileName: file.path }));
				});
		}, cb => {
			this.percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0;
			// let msg = `Minified ${totalFiles} ${plur('image', totalFiles)}`;

			// if (totalFiles > 0) {
			// 	msg += chalk.gray(` (saved ${prettyBytes(totalSavedBytes)} - ${percent.toFixed(1).replace(/\.0$/, '')}%)`);
			// }

			// log(`${PLUGIN_NAME}:`, msg);
			cb();
		});
};

module.exports.getDefaultPlugins = getDefaultPlugins;
module.exports.gifsicle = exposePlugin('gifsicle');
module.exports.jpegtran = exposePlugin('jpegtran');
module.exports.optipng = exposePlugin('optipng');
module.exports.svgo = exposePlugin('svgo');

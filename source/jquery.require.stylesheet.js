/**
 * jquery.require.stylesheet
 * Stylesheet loader plugin for $.require.
 *
 * Part of jquery.require family.
 * https://github.com/jstonne/jquery.require
 *
 * Copyright (c) 2012 Jensen Tonne
 * www.jstonne.com
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

$.require.addLoader('stylesheet', (function() {

	var self = function() {

		var batch = this,
			args = $.makeArray(arguments),
			options,
			names;

		// Expand arguments into its actual definition
		if ($.isPlainObject(args[0])) {
			options = args[0];
			names = args.slice(1);
		} else {
			names = args;
		}

		options = $.extend(
			{},
			self.defaultOptions,
			batch.options,
			{
				path: $.path + '/styles/'
			},
			options,
			{batch: batch}
		);

		$.each(names, function(i, name) {

			var task = new self.task(name, options),
				existingTask = self.stylesheets[task.url];

			task = existingTask || task;

			batch.addTask(task);

			if (!existingTask) {
				self.stylesheets[task.url] = task;
				task.start();
			}
		});
	};

	$.extend(self, {

		defaultOptions: {
			// Overrides require path.
			path: '',

			extension: (($.mode=='compressed') ? 'min.css' : 'css'),

			// @TODO: XHR loading.
			// Use XHR to load stylesheet. Default: Link injection. @import() for IE.
			xhr: false
		},

		setup: function() {

			$.extend(self.defaultOptions, options);
		},

		stylesheets: {},

		task: function(name, options) {

			var task = $.extend(this, $.Deferred());

			task.name = name;

			task.options = options;

			// Absolute path
			if ($.isUrl(name)) {

				task.url = name;

			// Relative path
			} else if (/^(\/|\.)/.test(name)) {

				task.url = $.uri(task.options.path)
							.toPath(name)
							.toString();

			// Module path
			} else {

				task.url = $.uri(task.options.path)
							.toPath('./' + name + '.' + task.options.extension)
							.toString();
			}

			// Remap task.url to task.options.url
			task.options.url = task.url;
		},

		loaders: {},

		loader: function(name) {

			// Pre-define loaders
			if ($.isArray(name)) {
				return $.map(name, function(name){
					return self.loader(name);
				});
			}

			// Resolve loaders
			if ($.isPlainObject(name)) {
				return $.map(name, function(name, options){
					return self.loader(name).resolve(options);
				});
			}

			// Get loader or create loaders
			var loader = self.loaders[name];

			if (!loader) {
				loader = self.loaders[name] = 
					$.Deferred()
						.done(function(options){
							if ($.isPlainObject(options)) return;
							$.stylesheet(options);
						});
			}

			return loader;
		}		
	});

	$.extend(self.task.prototype, {

		start: function() {

			var task = this;

			var loader = self.loaders[task.name];

			// If this stylesheet hasn't been requested yet
			if (!loader) {

				// Create a stylesheet loader
				loader = self.loader(task.name);

				// Insert the stylesheet
				if ($.stylesheet(task.options)) {
					loader.resolve();
				} else {
					loader.reject();
				}
			}

			loader.then(task.resolve, task.reject);
		}

	});

	return self;

})()
);

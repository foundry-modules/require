/**
 * jquery.require.template
 * Template loader plugin for $.require.
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

$.require.addLoader('template', (function() {

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
			options,
			{batch: batch}
		);

		$.each(names, function(i, name) {

			var task = new self.task(name, options);

			batch.addTask(task);

			task.start();
		});

	};

	$.extend(self, {

		defaultOptions: {
			// Overrides require path.
			path: '',

			extension: 'htm'
		},

		setup: function() {

			$.extend(self.defaultOptions, options);
		},

		task: function(name, options) {

			var task = $.extend(this, $.Deferred());

			task.name = name;

			task.options = options;

			// Template definition
			if ($.isArray(name)) {

				task.name = name[0];

				// Assign path to be resolved
				name = name[1];
			}

			// Absolute path
			if ($.isUrl(name)) {

				task.url = name;

			// Relative path
			} else if (/^(\/|\.)/.test(name)) {

				task.url = $.uri(task.options.path)
							.toPath(name)
							.toString();

			// Template module
			} else {

				task.url = $.uri(task.options.path)
							.toPath('./' + name + '.' + task.options.extension)
							.toString();
			}
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
				return $.map(name, function(name, content){
					return self.loader(name).resolve(content);
				});
			}

			// Get loader or create loaders
			var loader = self.loaders[name];

			if (!loader) {
				loader = self.loaders[name] = 
					$.Deferred()
						.done(function(content){
							$.template(name, content);
						});
			}

			return loader;
		}
	});

	$.extend(self.task.prototype, {

		start: function() {

			var task = this;

			// See if there is an existing loader
			var loader = self.loaders[task.name];

			if (!loader) {

				loader = self.loader(task.name);

				loader.xhr = 
					$.Ajax({
							url: task.url,
							dataType: "text"
						})
						.then(loader.resolve, loader.reject)
						.then(task.resolve, task.reject);
			}

			// Keep a reference to the loader in the task
			task.loader = loader;

			return task;
		}
	});

	return self;

})()
);

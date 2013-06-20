/**
 * jquery.require.language
 * Language loader plugin for $.require.
 *
 * Part of foundry-module/require family.
 * https://github.com/foundry-modules/require
 *
 * Copyright (c) 2011 Jason Ramos
 * www.stackideas.com
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */


$.require.addLoader('language', (function() {

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

		var task = new self.task(names, options);

		batch.addTask(task);

		task.start();
	};

	$.extend(self, {

		defaultOptions: {
			// Overrides require path.
			path: ''
		},

		setup: function() {

			$.extend(self.defaultOptions, options);
		},

		loaders: {},

		task: function(names, options) {

			var task = $.extend(this, $.Deferred());

			task.name = names.join(',');
			
			task.options = options;

			task.url = options.path;

			task.names = names;
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
						.done(function(string){
							$.language.add(name, string);
						});
			}

			return loader;
		}
	});

	$.extend(self.task.prototype, {

		start: function() {

			var task = this;

			var loaders = [];

			var names = 
				$.map(task.names, function(name){

					// Get existing loader or predefine loaders
					// so that subsequent require calls requesting
					// the same language keys won't be loaded again.
					var loader = self.loader(name);

					// Keep it to our array of loaders
					loader.push(loader);

					// If the language has resolved or rejected
					// remove it from list of language keys to load
					if (/resolved|rejected/.test(loader.state())) return null;

					return name;
				});

			// When unable to load language strings,
			// reject language loaders.
			task.fail(function(){
				$.each(names, function(i, name){
					self.loader(name).reject();
				});
			});

			// When all language strings has been loaded,
			// then we can resolve this task.
			$.when.apply(null, loaders)
				.then(task.resolve, task.reject);

			// If there are no language strings to load,
			// then wait for existing loaders to resolve or reject itself.
			if (names.length < 1) return task;

			task.xhr = 
				$.Ajax({
					url: task.url,
					type: "POST",
					data: {
						keys: names
					}
				})
				.done(function(strings){

					// If returned data is a language key-pair object, resolve task.
					if ($.isPlainObject(strings)) {

						self.loader(strings);
						// We don't need to resolve as the $.when above will resolve for us.
					} else {
						task.reject();
					}
				})
				.fail(function(){
					task.reject();
				});

			return task;
		}
	});

	return self;

})()
);

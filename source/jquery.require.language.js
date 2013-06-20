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

			// Filter out language keys that has been loaded
			task.names = $.map(names, function(name){
				return (self.loaders[name]) ? null : name;
			});

			// When unable to load language strings,
			// also reject language loaders.
			task.fail(function(){
				$.each(task.names, function(i, name){
					self.loader(name).reject();
				});
			});
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
			if ($.isPlainObject) {
				return $.map(name, function(name, content){
					return self.loader(name).resolve(content);
				});
			}

			// Get loader or create loaders
			return self.loaders[name] ||
				   self.loaders[name] = 
				       $.Deferred()
					       	.done(function(string){
					       		$.language.add(name, string);
					       	});
		}
	});

	$.extend(self.task.prototype, {

		start: function() {

			var task = this;

			// Resolve task straightaway if there are
			// no language strings to load.
			if (task.names.length < 1) return task.resolve();

			// Predefine loaders so subsequent require calls
			// requesting the same language keys won't be loaded again.
			self.loader(task.names);

			task.xhr = 
				$.Ajax({
					url: task.url,
					type: "POST",
					data: {
						languages: task.languages
					}
				})
				.done(function(strings){

					// If returned data is a language key-pair object, resolve task.
					if ($.isPlainObject(strings)) {
						self.loader(strings);
						task.resolve();
					} else {
						task.reject();
					}
				})
				.fail(function(){
					task.reject();
				});
		}
	});

	return self;

})()
);

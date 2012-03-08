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

		// Prevent parallel ajax call when chained
		// with other ajax loaders.
		setTimeout(function(){
			task.start();
		}, 1000);

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

			task.languages = names;
		}

	});

	$.extend(self.task.prototype, {

		start: function() {

			var task = this,
				taskBefore = task.taskBefore;

			task.loader = self.loaders[task.name] || (function() {

				var loader = $.ajax({

					url: task.url,

					type: "POST",

					data: {
						languages: task.languages
					}
				});

				return self.loaders[task.name] = loader;

			})();

			task.loader
				.done(function(languages) {

					$.language.add(languages);

					task.resolve();
				})
				.fail(function() {

					task.reject();

				});
		}
	});

	return self;

})()
);

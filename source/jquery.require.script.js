/**
 * jquery.require.script
 * Script loader plugin for $.require.
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

$.require.addLoader('script', (function() {

	// IE & Opera thinks punycoded urls are cross-domain requests,
	// and rejects the ajax request because they think they don't have
	// the necesary transport to facilitate such requests.

	var ajaxHost = $.uri($.indexUrl).host(),
		documentHost = $.uri(document.location.href).host();

	if (ajaxHost!==documentHost && ajaxHost.match("xn--")) {
		$.support.cors = true;
	}

	var canAsync = document.createElement("script").async === true || "MozAppearance" in document.documentElement.style || window.opera;

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

		// Create tasks and add it to the batch.
		var taskBefore;

		$.each(names, function(i, name) {

			var task = new self.task(name, options, taskBefore);

			batch.addTask(task);

			// Serial script loading
			if (options.serial && taskBefore!==undefined) {

				// Only start current task when the
				// task before is resolved/rejected.
				taskBefore.always(task.start);

			} else {

				task.start();
			}

			taskBefore = task;

		});

	};

	$.extend(self, {

		defaultOptions: {
			// Overrides require path.
			path: '',

			extension: (($.mode=='compressed') ? 'min.js' : 'js'),

			// Serial script loading. Default: Parallel script loading.
			serial: false,

			// Asynchronous script execution. Default: Synchronous script execution.
			async: false,

			// Use XHR to load script. Default: Script injection.
			xhr: false
		},

		setup: function() {

			$.extend(self.defaultOptions, options);
		},

		scripts: {},

		task: function(name, options, taskBefore) {

			var task = $.extend(this, $.Deferred());

			task.name = name;

			task.options = options;

			task.taskBefore = taskBefore;

			// Module assignment or module url override
			if ($.isArray(name)) {

				task.name = name[0] + "@" + name[1];

				task.moduleName = name[0];

				var overrideModuleUrl = name[2];

				// Module assignment
				if (!overrideModuleUrl) {

					// Set module flag
					task.defineModule = true;

					// Raise a warning if the module already exist
					if ($.module.registry[task.moduleName]) {
						console.warn("$.require.script: " + task.moduleName + ' exists! Using existing module instead.');
					}

					// Use XHR for module assignments
					task.options.xhr = true;
				}

				// Assign path to be resolved
				name = name[1];

				task.module = $.module(task.moduleName);
			}

			// Resolve name to paths

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

				task.module = $.module(name);
			}
		}

	});

	$.extend(self.task.prototype, {

		start: function() {

			var task = this,
				module = task.module;

			// If module has already been loaded,
			// we can skip the whole script loading process.
			if (module && module.status!=="pending") {
				task.waitForModule();
				return;
			}

			// Else load the script that has this module.
			task.load();
		},

		waitForModule: function() {

			var task = this,
				module = task.module;

			// Listen to the events in the module
			// without causing the module factory to execute.
			module.then(
				task.resolve,
				task.reject,
				task.notify
			);

			// When there is demand for this module,
			// we will call the module's done method.
			task.batch.required(function(){

				// This will execute the module factory
				// in case it wasn't executed before.
				module.done(task.resolve);
			});
		},

		load: function() {

			var task = this,
				taskBefore = task.taskBefore,
				options = {};

			// Use previously created script instance if exists,
			// else create a new one.
			task.script = self.scripts[task.url] || (function() {

				var script = (task.options.xhr) ?

					// Load script via ajax.
					$.ajax({

						url: task.url,

						dataType: "text"

					}) :

					// Load script using script injection.
					$.script({

						url: task.url,

						type: "text/javascript",

						async: task.options.async,

						timeout: task.batch.options.timeout,

						retry: task.batch.options.retry,

						verbose: task.batch.options.verbose

					});

				return self.scripts[task.url] = script;

			})();

			// At this point, script may be loaded, BUT may yet
			// to be executed under the following conditions:
			// - Module loaded via script injection/xhr.
			// - Script loaded via via xhr.
			task.script
				.done(function(data) {

					var resolveTask = function() {

						// If task loads a module, resolve/reject task only when
						// the module is resolved/rejected as the module itself
						// may perform additional require tasks.
						if (task.module) {

							task.waitForModule();

						} else {

							task.resolve();
						}
					};

					if (task.options.xhr) {

						if (task.defineModule) {

							// Create our own module factory
							task.module = $.module(task.moduleName, function() {

								var module = this;

								$.globalEval(data);

								module.resolveWith(data);
							});
						};

						// For XHR, if scripts needs to be executed synchronously
						// a.k.a. ordered script execution, then only eval it when
						// the task before it is resolved.
						if (!task.options.async || taskBefore) {

							taskBefore.done(function() {

								$.globalEval(data);

								resolveTask();

							});

							return;
						}

					};

					resolveTask();

				})
				.fail(function() {

					task.reject();
				});
		}
	});

	return self;

})()
);

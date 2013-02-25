/**
 * jquery.require.
 * A dependency loader built on top of $.Deferred() backbone.
 * An alternative take on RequireJS.
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

$.require = (function() {

	// internal function
	var getFolderPath = function(path) {
		return $.uri(path).setAnchor('').setQuery('').toPath('../').toString();
	};

	var self = function(options) {

		var batch = new self.batch(options);

		self.batches[batch.id] = batch;

		return batch;
	};

	// Require methods & properties

	$.extend(self, {

		defaultOptions: {

			// Path selection order:
			path: (function() {

				var path =

					$.scriptPath ||

					// By "require_path" attribute
					$('[require-path]').attr('require-path') ||

					// By last script tag's "src" attribute
					getFolderPath($('script:last').attr('src')) ||

					// By window location
					getFolderPath(window.location.href);

				if (/^(\/|\.)/.test(path)) {
					path = $.uri(window.location.href).toPath(path).toString();
				}

				return path;
			})(),

			timeout: 10000,

			retry: 3,

			verbose: ($.environment=="development")
		},

		setup: function(options) {

			$.extend(self.defaultOptions, options);
		},

		batches: {},

		batch: function(options) {

			var batch = this;

			batch.id = $.uid();

			// Batch manager tracks the state of tasks in batch.taskList and batch.tasks.
			batch.manager = $.Deferred();

			batch.taskList = [];

			batch.tasksFinalized = false;

			batch.options = $.extend({}, self.defaultOptions, options);
		},

		status: function(filter) {

			$.each(self.batches, function(i, batch){

				var count = {pending: 0, resolved: 0, rejected: 0, total: 0};

				// Convert into real deferred object for require batch
				// that was called without done().
				if (batch.state===undefined) { batch.done(); }


				// Calculate statistics
				$.each(batch.taskList, function(i, task){
					count[task.state()]++;
					count.total++;
				});

				var stat =
				 "d:" + count.resolved +
				" f:" + count.rejected +
				" p:" + count.pending  +
				" (" + count.total + ")";

				var batchName = stat + " [" + batch.state() + "] " + batch.id;

				// Create log group
				console.groupCollapsed(batchName);

				// Generate list
				console.info("$.require.batches[\"" + batch.id + "\"]", batch);

				$.each(batch.taskList, function(i, task){

					if (!filter || task.state()==filter) {
						console.log('[' + task.name + ']', task.state());
					}
				});

				console.groupEnd(batchName);
			});
		},

		loaders: {},

		addLoader: function(name, factory) {

			// Static call, e.g.
			// $.require.script.setup({});
			self[name] = factory;

			// Create proxy functions to require loaders,
			// assigning current batch to factory's "this".
			self.batch.prototype[name] = function() {

				var batch = this;

				factory.apply(batch, arguments);

				// Ensure require calls are chainable
				return batch;
			};

			self.loaders[name] = self[name] = factory;
		},

		removeLoader: function(name) {
			delete self.batch.prototype[name];
			delete self[name];
		}

	});

	// Batch class

	$.extend(self.batch.prototype, {

		addTask: function(task) {

			var batch = this;

			if (!$.isDeferred(task)) {
				return;
			};

			if (batch.taskFinalized) {

				if (batch.options.verbose) {
					console.warn('$.require: ' + task.name + ' ignored because tasks of this batch are finalized.', task);
				};

				return;
			};

			task.batch = batch;

			task.then(
				$.proxy(batch.taskDone, task),
				$.proxy(batch.taskFail, task),
				$.proxy(batch.taskProgress, task)
			);

			batch.taskList.push(task);
		},

		taskDone: function() {

			var task = this,
				batch = task.batch;

			batch.manager.notifyWith(batch, [task]);
		},

		taskFail: function() {

			var task = this,
				batch = task.batch;

			if (batch.options.verbose) {
				console.error('$.require: ' + task.name + ' failed to load.', task);
			};

			batch.manager.notifyWith(batch, [task]);
		},

		taskProgress: function() {

			var task = this,
				batch = task.batch;

			batch.manager.notifyWith(batch, [task]);
		},

		expand: function(args, opts) {

			var args = $.makeArray(args),
				options = opts || {},
				names = [];

            if ($.isPlainObject(args[0])) {
                options = $.extend(args[0], opts);
                names = args.slice(1);
            } else {
                names = args;
            }

            return {
            	options: options,
            	names: names
            }
		},

		// TODO: Statistics
		stat: function(){
		}
	});

	// Masquerade newly created batch instances as a pseudo-promise object
	// until one of those promise's method is called. This is to ensure that
	// no callbacks are fired too early until all loading tasks are finalized.

	$.each(['then','done','fail','always','pipe','progress'], function(i, func) {

		self.batch.prototype[func] = function() {

			var batch = this;

			// Finalize all tasks so no further tasks
			// can be added to the batch job.
			batch.taskFinalized = true;

			// Extend batch with batch manager's promise methods,
			// overriding original pseudo-promise methods.
			$.extend(batch, batch.manager.promise());

			// Create a master deferred object for all tasks
			batch.tasks = $.when.apply(null, batch.taskList);

			batch.tasks
				// Resolve batch if all tasks are done
				.done(function(){

					batch.manager.resolve();
				})

				// Reject batch if one of the task failed
				.fail(function(){

					if (batch.options.verbose) {
						console.info('$.require: Batch ' + batch.id + ' failed.', batch);
					};

					batch.manager.reject();
				});

			// Execute method that was originally called
			batch[func].apply(batch, arguments);

			return batch;
		}
	});

	return self;

})();

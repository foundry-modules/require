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

		var batch = new Batch(options);

		self.batches[batch.id] = batch;

		return batch;
	};

	// Require methods & properties

	$.extend(self, {

		defaultOptions: {

			// Path selection order:
			path: (function() {

				var path =

					$.path + "/scripts/" ||

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
			Batch.prototype[name] = function() {

				var batch = this;

				// Reset auto-finalize timer
				batch.autoFinalize();

				// this == batch
				factory.apply(batch, arguments);

				// Ensure require calls are chainable
				return batch;
			};

			self.loaders[name] = self[name] = factory;
		},

		removeLoader: function(name) {
			delete Batch.prototype[name];
			delete self[name];
		}

	});

	// This serves as batch id counter, it increments
	// whenever a new batch instance is created.
	var id = 0;

	// Batch class.
	// When calling $.require(), it is actually
	// returning an new instance of this class.
	var Batch = function(options) {

		var required = $.Callbacks("once memory"),
		    isRequired = false;

		// We are extending the batch instance
		// with the following properties.
		var batch = $.extend(this, {

			// Unique ID for this batch.
			id: ++id,

			// This array keeps a list of tasks to load.
			tasks: [],

			// Stores options like load path, timeout and retry count. 
			options: $.extend({}, self.defaultOptions, options),

			// Require chain automatically finalizes itself after
			// 300ms if no promise methods were called in the require chain.
			// Set false to disable.
			autoFinalizeDuration: 300,

			// When batch is finalized, further loader calls will be ignored.
			finalized: false,

			// Determine if the contents of the loaded task is required.
			required: function(fn) {
				if (fn===true) isRequired=true && required.fire();
				if ($.isFunction(fn)) required.add(fn);
				return isRequired;
			}
		});

		return batch;
	}

	$.extend(Batch.prototype, {

		addTask: function(task) {

			var batch = this;

			// Don't add invalid tasks.
			// Tasks should be a deferred object.
			if (!$.isDeferred(task)) return;

			// Don't accept anymore tasks if this batch is finalized.
			// Batch is finalized upon calling any of the promises, e.g.
			// done, fail, progress, always, then, pipe
			if (batch.finalized) return;

			// Add this task to the batch's task list
			batch.tasks.push(task);

			// Decorate task with a reference to the current batch
			task.batch = batch;
		},

		autoFinalize: function() {

			var batch = this,
				duration = batch.autoFinalizeDuration;

			// If autoFinalize is disabled, stop.
			if (duration===false) return;

			// Clear previous timer
			clearTimeout(batch.autoFinalizeTimer);

			// Start a new timer
			batch.autoFinalizeTimer = 
				setTimeout(function(){
					batch.finalize();
				}, duration);
		},

		finalize: function() {

			var batch = this;

			// If this batch has been finalized, stop.
			if (batch.finalized) return;

			// Finalize all tasks so no further
			// tasks can be added to this batch.
			batch.finalized = true;

			// Create batch manager which is a
			// master deferred object for all tasks.
			var manager = batch.manager = $.when.apply(null, batch.tasks);

			// Now that tasks are finalized, we can override
			// this batch's pseudo-promise methods with actual
			// promise methods from batch manager.
			var promise  = manager.promise(),
				progress = $.Callbacks();

			$.extend(batch, promise, {

				// Progress & notify method behaves differently.
				// We want progress callback to continue executing
				// even after after manager has been resolved or rejected.
				progress: progress.add,
				notify  : progress.fire,

				// Done method also behaves differently.
				// It will trigger an event notifying all tasks that
				// there is a demand for the content of the task.
				// This is currently used to lazy execute module factories
				// to ensure they don't execute until they are asked for.
				done: function(){

					// Trigger required event
					batch.required(true);

					// After done has been called once, it will be
					// replaced with the actual done method from the
					// master deferred object.
					batch.done = promise.done;

					// And the actual done method gets executed.
					return batch.done.apply(batch, arguments);
				}
			});

			// Flag to indicate whether to make
			// generate debug messages.
			var verbose = batch.options.verbose;

			manager
				.progress(function(state, task){
					if (verbose && state=="rejected") {
						console.warn('Require: Task ' + task.name + ' failed to load.', task);
					}
				})
				.fail(function(){
					if (verbose) {
						console.warn('Require: Batch ' + batch.id + ' failed.', batch);
					}
				});

			// We wrap this in a setTimeout to let existing require chain
			// to continue execute. This ensures that progress call in that
			// require chain receives the activities of each task below.
			setTimeout(function(){

				// Always notify whenever there is an activity on every task.
				$.each(batch.tasks, function(i, task){
					task.then(
						function(){ batch.notify("resolved", task) },
						function(){ batch.notify("rejected", task) },
						function(){ batch.notify("progress", task) }
					);
				});
			}, 1);
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
		}
	});

	// Masquerade newly created batch instances as a pseudo-promise object
	// until one of those promise's method is called. This is to ensure that
	// no callbacks are fired too early until all require tasks are finalized.
	$.each(["done","fail","progress","always","then"], function(i, method) {

		Batch.prototype[method] = function() {

			var batch = this;

			// Finalize batch
			batch.finalize();

			// Execute method that was originally called
			return batch[method].apply(batch, arguments);
		}
	});

	return self;

})();

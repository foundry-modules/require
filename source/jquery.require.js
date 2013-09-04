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

	return self;

})();

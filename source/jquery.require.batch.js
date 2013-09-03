// This serves as batch id counter, it increments
// whenever a new batch instance is created.
var id = 0;

// Batch class.
// When calling $.require(), it is actually
// returning an new instance of this class.
var Batch = function(options) {

	var required = $.Callbacks("once");

	// We are extending the batch instance
	// with the following properties.
	var batch = $.extend(this, {

		// Unique ID for this batch.
		id: ++id,

		// This array keeps a list of tasks to load.
		tasks: [],

		// Stores options like load path, timeout and retry count. 
		options: $.extend({}, self.defaultOptions, options),

		// When batch is finalized, further loader calls will be ignored.
		finalized: false,

		// Determine if the contents of the loaded task is required.
		required: false,
		isRequired: required.fire,
		whenRequired: required.add
	});

	// When batch is required, set required flag to true.
	batch.whenRequired = function(){
		batch.required = true;
	}

	return batch;
},

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
			progress = $.Callbacks(),

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

				// Trigger isRequired event
				batch.isRequired();

				// After done has been called once, it will be
				// replaced with the actual done method from the
				// master deferred object.
				batch.done = promise.done;

				// And the actual done method gets executed.
				batch.done.apply(batch, arguments);
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
			$.each(tasks, function(i, task){
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

	self.batch.prototype[method] = function() {

		var batch = this;

		// Finalize batch
		batch.finalize();

		// Execute method that was originally called
		batch[method].apply(batch, arguments);
	}
});
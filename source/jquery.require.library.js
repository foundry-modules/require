/**
 * jquery.require.library
 * Foundry script loader.
 *
 * Copyright (c) 2011 Jason Ramos
 * www.stackideas.com
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

$.require.addLoader('library', function() {

	var batch = this,
		args = $.makeArray(arguments),
		options = {},
		names;

	// Expand arguments into its actual definition
	if ($.isPlainObject(args[0])) {
		options = args[0];
		names = args.slice(1);
	} else {
		names = args;
	}

	$.extend(options, {
		path: $.scriptPath
	});

	return batch.script.apply(batch, [options].concat(names));

});

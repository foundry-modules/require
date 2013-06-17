all: join-script-files resolve-namespace wrap-script minify-script make-module

include ../../build/modules.mk

MODULE = require
SOURCE_SCRIPT_FILES = ${SOURCE_SCRIPT_FOLDER}/jquery.require.js\
	${SOURCE_SCRIPT_FOLDER}/jquery.require.script.js\
	${SOURCE_SCRIPT_FOLDER}/jquery.require.stylesheet.js\
	${SOURCE_SCRIPT_FOLDER}/jquery.require.template.js\
	${SOURCE_SCRIPT_FOLDER}/jquery.require.language.js\
	${SOURCE_SCRIPT_FOLDER}/jquery.require.library.js\
	${SOURCE_SCRIPT_FOLDER}/jquery.require.image.js

module: module_ resolve-namespace wrap-script minify-script

module_:
	$(eval MODULE = module)

make-module:
	make module
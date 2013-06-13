all: join resolve-namespace wrap-core minify make-module

include ../../build/modules.mk

MODULE = require
SOURCE_FILES = ${SOURCE_DIR}/jquery.require.js\
	${SOURCE_DIR}/jquery.require.script.js\
	${SOURCE_DIR}/jquery.require.stylesheet.js\
	${SOURCE_DIR}/jquery.require.template.js\
	${SOURCE_DIR}/jquery.require.language.js\
	${SOURCE_DIR}/jquery.require.library.js\
	${SOURCE_DIR}/jquery.require.image.js

module: module_ resolve-namespace wrap-core minify

module_:
	$(eval MODULE = module)
	$(eval SOURCE_FILE = ${SOURCE_DIR}/${FILENAME})

make-module:
	make module
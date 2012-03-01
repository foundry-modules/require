include ../../build/modules.mk

SOURCE = ${SOURCE_DIR}/jquery.require.js\
	${SOURCE_DIR}/jquery.require.script.js\
	${SOURCE_DIR}/jquery.require.stylesheet.js\
	${SOURCE_DIR}/jquery.require.template.js\
	${SOURCE_DIR}/jquery.require.language.js\
	${SOURCE_DIR}/jquery.require.library.js

BUILD_FILE = require.js

PRODUCTION = ${PRODUCTION_DIR}/${BUILD_FILE}

DEVELOPMENT = ${DEVELOPMENT_DIR}/${BUILD_FILE}

all: module require min

module:
	cp ${SOURCE_DIR}/jquery.module.js ${DEVELOPMENT_DIR}/module.js
	${UGLIFYJS} ${DEVELOPMENT_DIR}/module.js > ${PRODUCTION_DIR}/module.js

require:
	@@cat ${SOURCE} > ${DEVELOPMENT}.tmp
	${WRAP} ${DEVELOPMENT}.tmp > ${DEVELOPMENT}
	rm -fr ${DEVELOPMENT}.tmp

min:
	${UGLIFYJS} ${DEVELOPMENT} > ${PRODUCTION}

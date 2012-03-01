include ../../build/modules.mk

MODULE = require
FILENAME = ${MODULE}.js
RAWFILE = ${DEVELOPMENT_DIR}/${MODULE}.raw.js

SOURCE = ${SOURCE_DIR}/jquery.require.js\
	${SOURCE_DIR}/jquery.require.script.js\
	${SOURCE_DIR}/jquery.require.stylesheet.js\
	${SOURCE_DIR}/jquery.require.template.js\
	${SOURCE_DIR}/jquery.require.language.js\
	${SOURCE_DIR}/jquery.require.library.js

PRODUCTION = ${PRODUCTION_DIR}/${FILENAME}
DEVELOPMENT = ${DEVELOPMENT_DIR}/${FILENAME}

all: raw module clean

module:
	${WRAP} ${RAWFILE} > ${DEVELOPMENT}
	${UGLIFYJS} ${DEVELOPMENT} > ${PRODUCTION}
	${WRAP} ${DEVELOPMENT_DIR}/module.raw.js > ${DEVELOPMENT_DIR}/module.js
	${UGLIFYJS} ${DEVELOPMENT_DIR}/module.js > ${PRODUCTION_DIR}/module.js

raw:
	cat ${SOURCE} > ${RAWFILE}
	cp ${SOURCE_DIR}/jquery.module.js ${DEVELOPMENT_DIR}/module.raw.js

clean:
	rm -fr ${RAWFILE}
	rm -fr ${DEVELOPMENT_DIR}/module.raw.js

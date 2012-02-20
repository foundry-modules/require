SRC_DIR = source
BUILD_DIR = build
FOUNDRY_DIR = ../..
PRODUCTION_DIR = ${FOUNDRY_DIR}/scripts
DEVELOPMENT_DIR = ${FOUNDRY_DIR}/scripts_
UGLIFY = uglifyjs --unsafe -nc

BASE_FILES = ${SRC_DIR}/jquery.require.js\
	${SRC_DIR}/jquery.require.script.js\
	${SRC_DIR}/jquery.require.stylesheet.js\
	${SRC_DIR}/jquery.require.template.js

all: premake module require min foundry

premake:
	mkdir -p ${BUILD_DIR}

module:
	cp ${SRC_DIR}/jquery.module.js ${BUILD_DIR}

require:
	@@cat ${BASE_FILES} > ${BUILD_DIR}/jquery.require.js

min:
	${UGLIFY} ${BUILD_DIR}/jquery.module.js > ${BUILD_DIR}/jquery.module.min.js
	${UGLIFY} ${BUILD_DIR}/jquery.require.js > ${BUILD_DIR}/jquery.require.min.js

foundry:
	cat ${FOUNDRY_DIR}/build/foundry_intro.js \
		${BUILD_DIR}/jquery.require.js \
		${FOUNDRY_DIR}/build/foundry_outro.js \
		> ${DEVELOPMENT_DIR}/require.js

	cat ${FOUNDRY_DIR}/build/foundry_intro.js \
		${BUILD_DIR}/jquery.module.js \
		${FOUNDRY_DIR}/build/foundry_outro.js \
		> ${DEVELOPMENT_DIR}/module.js

	${UGLIFY} ${DEVELOPMENT_DIR}/require.js > ${PRODUCTION_DIR}/require.js
	${UGLIFY} ${DEVELOPMENT_DIR}/module.js > ${PRODUCTION_DIR}/module.js

# poe-ui-kit builder

### Find the poe-ui-kit directory

POE := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

### Add node_modules executables to the path

LOCAL_PATH := $(CURDIR)/node_modules/.bin:$(POE)/node_modules/.bin
PATH := $(LOCAL_PATH):$(PATH)

### General targets

start: node_modules .env
	@$(shell cat .env | grep '^#' --invert-match | xargs) npm start

clean:
	rm -fr build components manifest.json

### Install targets

.env: .env.example
	@cp $< $@

node_modules: package.json
	@npm install

### Build targets

prod:
	@mkdir -p build
	@PATH=$(PATH) MANIFEST=manifest.min.json webpack --bail --config $(POE)/webpack.config.js --output-path build

### Lint/test targets

lint: app.js $(JS_SRC)
	@PATH=$(PATH) jshint $?

.PHONY: clean build prod install lint

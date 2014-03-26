# poe-ui-kit builder

### Source files

JS_SRC      = $(shell find public -type f -name '*.js')
CSS_SRC     = $(shell find public -type f -name '*.css')
STYL_SRC    = $(shell find public -type f -name '*.styl')
PARTIAL_SRC = $(shell find public -type f -name '*.jade')
SRC         = $(JS_SRC) $(CSS_SRC) $(STYL_SRC) $(PARTIAL_SRC)

### Out files

CSS_OUT = build/style.css
JS_OUT  = build/app.js build/vendor.js build/require.js
OUT     = $(CSS_OUT) $(JS_OUT)

### Min files

CSS_MIN = $(CSS_OUT:.css=.min.css)
JS_MIN  = $(JS_OUT:.js=.min.js)
MIN     = $(CSS_MIN) $(JS_MIN)

### Find the poe-ui-kit directory

POE = $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

### Add node_modules executables to the path

LOCAL_PATH := $(CURDIR)/node_modules/.bin:$(POE)/node_modules/.bin
PATH := $(LOCAL_PATH):$(PATH)

### Setup paths to local node_modules

COMP_FILTER = $(POE)/node_modules/component-filter
STYLE_BUILDER ?= $(POE)/node_modules/shoelace-stylus

### Define component builder functions

define COMPONENT_BUILD_CSS
PATH=$(PATH) component build \
  --use $(COMP_FILTER)/scripts,$(COMP_FILTER)/json,$(COMP_FILTER)/templates,$(STYLE_BUILDER) \
  --name style
rm -f build/style.js
endef

define COMPONENT_BUILD_JS
PATH=$(PATH) component build \
  --copy \
  --no-require \
  --name $1 \
  --use $(POE)/plugins/nghtml,$(COMP_FILTER)/styles,$(COMP_FILTER)/$2
endef

### Define some generic build targets

build   : install lint $(OUT)
prod    : build $(MIN) manifest.json
install : node_modules components

### General targets

start: build .env
	@foreman start

clean:
	rm -fr build components manifest.json

### Install targets

.env: .env.example
	@cp $< $@

node_modules: package.json
	@npm install

components: component.json
	@PATH=$(PATH) component install

### Javscript targets

build/require.js:
	@mkdir -p build
	@cp $(POE)/node_modules/component-require/lib/require.js $@

build/app.js: $(JS_SRC) $(PARTIAL_SRC) component.json
	@$(call COMPONENT_BUILD_JS,app,vendor)

build/vendor.js: component.json
	@$(call COMPONENT_BUILD_JS,vendor,app)

build/%.min.js: $(JS_OUT)
	@uglifyjs \
	  --compress \
	  --mangle \
	  -o $@ $<

### CSS Targets

build/style.css: $(CSS_SRC) $(STYL_SRC) component.json
	@$(call COMPONENT_BUILD_CSS)

build/%.min.css: $(CSS_OUT)
	@PATH=$(PATH) cleancss \
	  --remove-empty \
	  --s0 \
	  --skip-import \
	  --output $@ $<

### Lint/test targets

lint: $(JS_SRC)
	@PATH=$(PATH) jshint app.js public/javascripts/*

### Production targets

manifest.json: $(MIN)
	@PATH=$(PATH) simple-assets \
	  --glob 'build/**/!(cache-)*' \
	  --copy \
	  --prefix cache-

.PHONY: clean build prod install lint

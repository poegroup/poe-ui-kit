# poe-ui-kit builder

### Setup targets for app files

JS_FILES      = $(shell find public -type f -name '*.js')
CSS_FILES     = $(shell find public -type f -name '*.css')
STYL_FILES    = $(shell find public -type f -name '*.styl')
PARTIAL_FILES = $(shell find public -type f -name '*.jade')

### Resolve some commonly used paths

POE         = $(CURDIR)/node_modules/poe-ui
POE_BIN     = $(POE)/node_modules/.bin
COMP_FILTER	  = $(POE)/node_modules/component-filter
STYLE_BUILDER    ?= $(POE)/node_modules/shoelace-stylus

### Define component builder functions

define COMPONENT_BUILD_CSS
$(POE_BIN)/component build --use $(COMP_FILTER)/scripts,$(COMP_FILTER)/json,$(COMP_FILTER)/templates,$(STYLE_BUILDER) --name style
rm -f build/style.js
endef

define COMPONENT_BUILD_JS_APP
$(POE_BIN)/component build --copy --no-require --use $(POE)/plugins/nghtml,$(COMP_FILTER)/vendor,$(COMP_FILTER)/styles --name app
endef

define COMPONENT_BUILD_JS_VENDOR
$(POE_BIN)/component build --copy --no-require --use $(POE)/plugins/nghtml,$(COMP_FILTER)/app,$(COMP_FILTER)/styles --name vendor
endef

define COMPONENT_BUILD_JS_REQUIRE
mkdir -p build
cp $(POE)/node_modules/component-require/lib/require.js build/require.js
endef

### Define some generic build targets

build   : install lint build/require.js build/app.js build/style.css build/vendor.js
prod    : build build/require.min.js build/app.min.js build/style.min.css build/vendor.min.js manifest.json
install : node_modules components

### Define a generic way to start the application

start: build .env
	@foreman start

### Setup app build targets

.env: .env.example
	@cp $< $@

node_modules: package.json
	@npm install

components: component.json
	@$(POE_BIN)/component install

build/require.js:
	@$(call COMPONENT_BUILD_JS_REQUIRE)

build/require.min.js: build/require.js
	@$(POE_BIN)/uglifyjs --compress --mangle -o $@ $<

build/app.js: $(JS_FILES) $(PARTIAL_FILES) component.json
	@$(call COMPONENT_BUILD_JS_APP)

build/app.min.js: build/app.js
	@$(POE_BIN)/uglifyjs --compress --mangle -o $@ $<

build/vendor.js: component.json
	@$(call COMPONENT_BUILD_JS_VENDOR)

build/vendor.min.js: build/vendor.js
	@$(POE_BIN)/uglifyjs --compress --mangle -o $@ $<

build/style.css: $(CSS_FILES) $(STYL_FILES) component.json
	@$(call COMPONENT_BUILD_CSS)

build/style.min.css: build/style.css
	@$(POE_BIN)/cleancss --remove-empty --s0 --skip-import --output $@ $<

lint: $(JS_FILES)
	@$(POE_BIN)/jshint app.js public/javascripts/*

manifest.json: $(wildcard build/*)
	@$(POE_BIN)/simple-assets --glob 'build/**/!(cache-)*' --copy --prefix cache-

clean:
	rm -fr build components manifest.json

.PHONY: clean build prod install lint

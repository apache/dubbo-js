# See https://tech.davis-hansson.com/p/make/

SHELL := bash
.DELETE_ON_ERROR:
.SHELLFLAGS := -e -u -o pipefail -c
.DEFAULT_GOAL := all
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-print-directory
TMP   := .tmp
BIN   := .tmp/bin
BUILD := .tmp/build
GEN   := .tmp/gen
CROSSTEST_VERSION := 162d496c009e2ffb1a638b4a2ea789e9cc3331bb
LICENSE_HEADER_YEAR_RANGE := 2021-2023
LICENSE_IGNORE := -e .tmp\/ -e node_modules\/ -e packages\/.*\/src\/gen\/ -e packages\/.*\/dist\/ -e scripts\/
NODE20_VERSION ?= v20.0.0
NODE19_VERSION ?= v19.9.0
NODE18_VERSION ?= v18.16.0
NODE16_VERSION ?= v16.20.0
NODE_OS = $(subst Linux,linux,$(subst Darwin,darwin,$(shell uname -s)))
NODE_ARCH = $(subst x86_64,x64,$(subst aarch64,arm64,$(shell uname -m)))

node_modules: pnpm-lock.yaml
	pnpm install --frozen-lockfile

node_modules/.bin/protoc-gen-es: node_modules

$(BIN)/license-header: Makefile
	@mkdir -p $(@D)
	GOBIN=$(abspath $(BIN)) go install github.com/bufbuild/buf/private/pkg/licenseheader/cmd/license-header@v1.1.0

$(BIN)/node20: Makefile
	@mkdir -p $(@D)
	curl -sSL https://nodejs.org/dist/$(NODE20_VERSION)/node-$(NODE20_VERSION)-$(NODE_OS)-$(NODE_ARCH).tar.xz | tar xJ -C $(TMP) node-$(NODE20_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node
	mv $(TMP)/node-$(NODE20_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(@)
	rm -r $(TMP)/node-$(NODE20_VERSION)-$(NODE_OS)-$(NODE_ARCH)
	@touch $(@)

$(BIN)/node19: Makefile
	@mkdir -p $(@D)
	curl -sSL https://nodejs.org/dist/$(NODE19_VERSION)/node-$(NODE19_VERSION)-$(NODE_OS)-$(NODE_ARCH).tar.xz | tar xJ -C $(TMP) node-$(NODE19_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node
	mv $(TMP)/node-$(NODE19_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(@)
	rm -r $(TMP)/node-$(NODE19_VERSION)-$(NODE_OS)-$(NODE_ARCH)
	@touch $(@)

$(BIN)/node18: Makefile
	@mkdir -p $(@D)
	curl -sSL https://nodejs.org/dist/$(NODE18_VERSION)/node-$(NODE18_VERSION)-$(NODE_OS)-$(NODE_ARCH).tar.xz | tar xJ -C $(TMP) node-$(NODE18_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node
	mv $(TMP)/node-$(NODE18_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(@)
	rm -r $(TMP)/node-$(NODE18_VERSION)-$(NODE_OS)-$(NODE_ARCH)
	@touch $(@)

$(BIN)/node16: Makefile
	@mkdir -p $(@D)
	curl -sSL https://nodejs.org/dist/$(NODE16_VERSION)/node-$(NODE16_VERSION)-$(NODE_OS)-$(NODE_ARCH).tar.xz | tar xJ -C $(TMP) node-$(NODE16_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node
	mv $(TMP)/node-$(NODE16_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(@)
	rm -r $(TMP)/node-$(NODE16_VERSION)-$(NODE_OS)-$(NODE_ARCH)
	@touch $(@)

$(BUILD)/protoc-gen-apache-dubbo-es: node_modules tsconfig.base.json packages/protoc-gen-apache-dubbo-es/tsconfig.json $(shell find packages/protoc-gen-apache-dubbo-es/src -name '*.ts')
	npm run -w packages/protoc-gen-apache-dubbo-es clean
	npm run -w packages/protoc-gen-apache-dubbo-es build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/protoc-gen-apache-dubbo-web: node_modules tsconfig.base.json packages/protoc-gen-apache-dubbo-web/tsconfig.json $(shell find packages/protoc-gen-apache-dubbo-web/src -name '*.ts')
	npm run -w packages/protoc-gen-apache-dubbo-web clean
	npm run -w packages/protoc-gen-apache-dubbo-web build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo: $(GEN)/dubbo node_modules tsconfig.base.json packages/dubbo/tsconfig.json $(shell find packages/dubbo/src -name '*.ts') packages/dubbo/*.js
	npm run -w packages/dubbo clean
	npm run -w packages/dubbo build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo-node: $(BUILD)/dubbo packages/dubbo-node/tsconfig.json $(shell find packages/dubbo-node/src -name '*.ts')
	npm run -w packages/dubbo-node clean
	npm run -w packages/dubbo-node build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo-fastify: $(BUILD)/dubbo $(BUILD)/dubbo-node packages/dubbo-fastify/tsconfig.json $(shell find packages/dubbo-fastify/src -name '*.ts')
	npm run -w packages/dubbo-fastify clean
	npm run -w packages/dubbo-fastify build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo-express: $(BUILD)/dubbo $(BUILD)/dubbo-node packages/dubbo-express/tsconfig.json $(shell find packages/dubbo-express/src -name '*.ts')
	npm run -w packages/dubbo-express clean
	npm run -w packages/dubbo-express build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo-next: $(BUILD)/dubbo $(BUILD)/dubbo-node packages/dubbo-next/tsconfig.json $(shell find packages/dubbo-next/src -name '*.ts')
	npm run -w packages/dubbo-next clean
	npm run -w packages/dubbo-next build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo-web: $(BUILD)/dubbo packages/dubbo-web/tsconfig.json $(shell find packages/dubbo-web/src -name '*.ts')
	npm run -w packages/dubbo-web clean
	npm run -w packages/dubbo-web build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo-web-test: $(BUILD)/dubbo-web $(GEN)/dubbo-web-test packages/dubbo-web-test/tsconfig.json $(shell find packages/dubbo-web-test/src -name '*.ts')
	npm run -w packages/dubbo-web-test clean
	npm run -w packages/dubbo-web-test build
	@mkdir -p $(@D)
	@touch $(@)

$(BUILD)/dubbo-node-test: $(BUILD)/dubbo-node $(BUILD)/dubbo-fastify $(BUILD)/dubbo-express $(BUILD)/dubbo-next $(GEN)/dubbo-node-test packages/dubbo-node-test/tsconfig.json $(shell find packages/dubbo-node-test/src -name '*.ts')
	npm run -w packages/dubbo-node-test clean
	npm run -w packages/dubbo-node-test build
	@mkdir -p $(@D)
	@touch $(@)

$(GEN)/dubbo: node_modules/.bin/protoc-gen-es packages/dubbo/buf.gen.yaml $(shell find packages/dubbo/src -name '*.proto') Makefile
	rm -rf packages/dubbo/src/gen/*
	npm run -w packages/dubbo generate
	@mkdir -p $(@D)
	@touch $(@)

$(GEN)/dubbo-web-test: node_modules/.bin/protoc-gen-es $(BUILD)/protoc-gen-apache-dubbo-es packages/dubbo-web-test/buf.gen.yaml Makefile
	rm -rf packages/dubbo-web-test/src/gen/*
	npm run -w packages/dubbo-web-test generate ../../internal/proto
	npm run -w packages/dubbo-web-test generate buf.build/bufbuild/eliza
	@mkdir -p $(@D)
	@touch $(@)

$(GEN)/dubbo-node-test: node_modules/.bin/protoc-gen-es $(BUILD)/protoc-gen-apache-dubbo-es packages/dubbo-node-test/buf.gen.yaml Makefile
	rm -rf packages/dubbo-node-test/src/gen/*
	npm run -w packages/dubbo-node-test generate ../../internal/proto
	@mkdir -p $(@D)
	@touch $(@)

$(GEN)/dubbo-web-bench: node_modules/.bin/protoc-gen-es $(BUILD)/protoc-gen-apache-dubbo-es packages/dubbo-web-bench/buf.gen.yaml Makefile
	rm -rf packages/dubbo-web-bench/src/gen/*
	npm run -w packages/dubbo-web-bench generate buf.build/bufbuild/eliza:847d7675503fd7aef7137c62376fdbabcf777568
	@mkdir -p $(@D)
	@touch $(@)


.PHONY: help
help: ## Describe useful make targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-30s %s\n", $$1, $$2}'

.PHONY: all
all: build test format lint bench ## build, test, format, lint, and bench (default)

.PHONY: clean
clean: crosstestserverstop ## Delete build artifacts and installed dependencies
	@# -X only removes untracked files, -d recurses into directories, -f actually removes files/dirs
	git clean -Xdf

.PHONY: build
build: $(BUILD)/dubbo $(BUILD)/dubbo-web $(BUILD)/dubbo-node $(BUILD)/dubbo-fastify $(BUILD)/dubbo-express $(BUILD)/dubbo-next $(BUILD)/protoc-gen-apache-dubbo-es $(BUILD)/protoc-gen-apache-dubbo-web ## Build

.PHONY: test
test: testdubbopackage testdubbonodepackage testnode testwebnode testwebbrowser ## Run all tests, except browserstack

.PHONY: testdubbopackage
testdubbopackage: $(BUILD)/dubbo
	npm run -w packages/dubbo jasmine

.PHONY: testdubbonodepackage
testdubbonodepackage: $(BIN)/node16 $(BIN)/node18 $(BIN)/node19 $(BIN)/node20 $(BUILD)/dubbo-node
	cd packages/dubbo-node && PATH="$(abspath $(BIN)):$(PATH)" node16 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	cd packages/dubbo-node && PATH="$(abspath $(BIN)):$(PATH)" node18 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	cd packages/dubbo-node && PATH="$(abspath $(BIN)):$(PATH)" node19 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	cd packages/dubbo-node && PATH="$(abspath $(BIN)):$(PATH)" node20 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json

.PHONY: testnode
testnode: $(BIN)/node16 $(BIN)/node18 $(BIN)/node19 $(BIN)/node20 $(BUILD)/dubbo-node-test
	$(MAKE) crosstestserverrun
	cd packages/dubbo-node-test && PATH="$(abspath $(BIN)):$(PATH)" node16 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	cd packages/dubbo-node-test && PATH="$(abspath $(BIN)):$(PATH)" node18 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	cd packages/dubbo-node-test && PATH="$(abspath $(BIN)):$(PATH)" node19 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	cd packages/dubbo-node-test && PATH="$(abspath $(BIN)):$(PATH)" node20 --trace-warnings ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	$(MAKE) crosstestserverstop

.PHONY: testwebnode
testwebnode: $(BIN)/node18 $(BUILD)/dubbo-web-test
	$(MAKE) crosstestserverrun
	$(MAKE) dubbonodeserverrun
	cd packages/dubbo-web-test && PATH="$(abspath $(BIN)):$(PATH)" NODE_TLS_REJECT_UNAUTHORIZED=0 node18 ./node_modules/jasmine/bin/jasmine --config=jasmine.json
	$(MAKE) crosstestserverstop
	$(MAKE) dubbonodeserverstop

.PHONY: testwebbrowser
testwebbrowser: $(BUILD)/dubbo-web-test
	$(MAKE) crosstestserverrun
	$(MAKE) dubbonodeserverrun
	npm run -w packages/dubbo-web-test karma
	$(MAKE) crosstestserverstop
	$(MAKE) dubbonodeserverstop

.PHONY: testwebbrowserlocal
testwebbrowserlocal: $(BUILD)/dubbo-web-test
	$(MAKE) crosstestserverrun
	$(MAKE) dubbonodeserverrun
	npm run -w packages/dubbo-web-test karma-serve
	$(MAKE) crosstestserverstop
	$(MAKE) dubbonodeserverstop

.PHONY: testwebbrowserstack
testwebbrowserstack: $(BUILD)/dubbo-web-test
	npm run -w packages/dubbo-web-test karma-browserstack

.PHONY: lint
lint: node_modules $(BUILD)/dubbo-web $(GEN)/dubbo-web-bench ## Lint all files
	npx eslint --max-warnings 0 .

.PHONY: format
format: node_modules $(BIN)/license-header ## Format all files, adding license headers
	npx prettier --write '**/*.{json,js,jsx,ts,tsx,css}' --loglevel error
	comm -23 \
		<(git ls-files --cached --modified --others --no-empty-directory --exclude-standard | sort -u | grep -v $(LICENSE_IGNORE) ) \
		<(git ls-files --deleted | sort -u) | \
		xargs $(BIN)/license-header \
			--license-type "apache" \
			--copyright-holder "Buf Technologies, Inc." \
			--year-range "$(LICENSE_HEADER_YEAR_RANGE)"

.PHONY: bench
bench: node_modules $(GEN)/dubbo-web-bench $(BUILD)/dubbo-web ## Benchmark code size
	npm run -w packages/dubbo-web-bench report

.PHONY: setversion
setversion: ## Set a new version in for the project, i.e. make setversion SET_VERSION=1.2.3
	node scripts/set-workspace-version.js $(SET_VERSION)
	rm pnpm-lock.yaml
	rm -rf node_modules
	npm i
	$(MAKE) all

# Recommended procedure:
# 1. Set a new version with the target `setversion`
# 2. Commit and push all changes
# 3. Login with `npm login`
# 4. Run this target, publishing to npmjs.com
# 5. Tag the release
.PHONY: release
release: all ## Release npm packages
	@[ -z "$(shell git status --short)" ] || (echo "Uncommitted changes found." && exit 1);
	npm publish \
		--workspace packages/dubbo-web \
		--workspace packages/dubbo-node \
		--workspace packages/dubbo-fastify \
		--workspace packages/dubbo-express \
		--workspace packages/dubbo-next \
		--workspace packages/dubbo \
		--workspace packages/protoc-gen-apache-dubbo-es \
		--workspace packages/protoc-gen-apache-dubbo-web \

.PHONY: crosstestserverstop
crosstestserverstop:
	-docker container stop servergrpc

.PHONY: crosstestserverrun
crosstestserverrun: crosstestserverstop
	docker run --rm --name servergrpc -p 8083:8083 -d \
		bufbuild/connect-crosstest:$(CROSSTEST_VERSION) \
		/usr/local/bin/servergrpc --port "8083" --cert "cert/localhost.crt" --key "cert/localhost.key"

.PHONY: dubbonodeserverrun
dubbonodeserverrun: $(BUILD)/dubbo-node-test
	PATH="$(abspath $(BIN)):$(PATH)" node18 packages/dubbo-node-test/dubbo-node-h1-server.mjs restart

.PHONY: dubbonodeserverstop
dubbonodeserverstop: $(BUILD)/dubbo-node-test
	PATH="$(abspath $(BIN)):$(PATH)" node18 packages/dubbo-node-test/dubbo-node-h1-server.mjs stop

.PHONY: updatelocalhostcert
updatelocalhostcert:
	openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -days 300 -keyout packages/dubbo-node-test/localhost-key.pem -out packages/dubbo-node-test/localhost-cert.pem

.PHONY: checkdiff
checkdiff:
	@# Used in CI to verify that `make` does not produce a diff
	test -z "$$(git status --porcelain | tee /dev/stderr)"

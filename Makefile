default: build-interpret-util build-dubbo

build-dubbo: clean-dubbo 
	tsc --project ./packages/dubbo/tsconfig.json
	tsc --project ./packages/dubbo/tsconfig-es6.json
	@echo "compile duboo successfully 👌\n"

clean-dubbo:
	rm -rf ./packages/dubbo/es6
	rm -rf ./packages/dubbo/es7
	@echo "clean dubbo successfully 👌\n"

build-interpret-util:clean-interpret-util
	tsc --project ./packages/interpret-util/tsconfig.json
	@echo "compile interpret-util successfully 👌\n"

clean-interpret-util:
	rm -rf ./packages/interpret-util/lib
	@echo "clean interpret-util successfully 👌\n"

build-demo-api:clean-demo-api
	cd ./java/dubbo-demo/dubbo-demo-api && mvn package
	cd ./java/dubbo-demo/dubbo-demo-api && mvn install dependency:copy-dependencies
	@echo "build demo-api successfully 👌\n"

clean-demo-api:
	cd ./java/dubbo-demo/dubbo-demo-api && mvn clean
	@echo "clean demo-api successfully 👌\n"

interpret-jar:build-demo-api
	ts-node ./packages/interpret-cli/src/cli.ts interpret -c dubbo.json


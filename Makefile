build-dubbo: clean-dubbo 
	tsc --project ./packages/dubbo/tsconfig.json
	tsc --project ./packages/dubbo/tsconfig-es6.json
	@echo "compile duboo successfully 👌\n"

clean-dubbo:
	rm -rf ./packages/dubbo/es6
	rm -rf ./packages/dubbo/es7
	@echo "clean dubbo successfully 👌\n"

test-dubbo:
	./node_modules/.bin/jest --testPathPattern packages/dubbo/src/__tests__ --verbose --watch 

build-demo: demo-api-build
	interpret -c dubbo.json

demo-api-build:
	cd ./java/dubbo-demo/dubbo-demo-api && mvn package
	cd ./java/dubbo-demo/dubbo-demo-api && mvn install dependency:copy-dependencies
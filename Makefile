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

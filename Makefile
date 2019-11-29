#
#  Licensed to the Apache Software Foundation (ASF) under one or more
#  contributor license agreements.  See the NOTICE file distributed with
#  this work for additional information regarding copyright ownership.
#  The ASF licenses this file to You under the Apache License, Version 2.0
#  (the "License"); you may not use this file except in compliance with
#  the License.  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

default: build-interpret-util build-dubbo

build-dubbo: clean-dubbo
	./node_modules/.bin/tsc --project ./packages/dubbo/tsconfig.json
	./node_modules/.bin/tsc --project ./packages/dubbo/tsconfig-es6.json
	@echo "compile duboo successfully 👌\n"

clean-dubbo:
	rm -rf ./packages/dubbo/es6
	rm -rf ./packages/dubbo/es7
	@echo "clean dubbo successfully 👌\n"

build-interpret-util:clean-interpret-util
	./node_modules/.bin/tsc --project ./packages/interpret-util/tsconfig.json
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

build-dubbo-invoker:clean-dubbo-invoker
	./node_modules/.bin/tsc --project ./packages/dubbo-invoker/tsconfig.json
	@echo "compile dubbo-invoker successfully 👏\n"

clean-dubbo-invoker:
	rm -rf ./packages/dubbo-invoker/lib
	@echo "clean dubbo-invoker successfully 👏\n"


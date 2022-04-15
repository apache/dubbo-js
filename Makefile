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

dubbo-common = ./packages/dubbo-common
dubbo-registry = ./packages/dubbo-registry
dubbo-serialization = ./packages/dubbo-serialization
dubbo-service = ./packages/dubbo-service
dubbo-consumer = ./packages/dubbo-consumer
interpret-cli = ./packages/interpret-cli
interpret-util = ./packages/interpret-util
zone-context = ./packages/zone-context

default: build

build: clean
	npx tsc -p ${dubbo-common}/tsconfig.json
	npx tsc -p ${dubbo-registry}/tsconfig.json
	npx tsc -p ${dubbo-serialization}/tsconfig.json
	npx tsc -p ${dubbo-service}/tsconfig.json
	npx tsc -p ${dubbo-consumer}/tsconfig.json
	npx tsc -p ${interpret-cli}/tsconfig.json
	npx tsc -p ${interpret-util}/tsconfig.json
	npx tsc -p ${zone-context}/tsconfig.json
	@echo "build success👏\n"

clean:
	rm -rf ${dubbo-common}/lib
	rm -rf ${dubbo-registry}/lib
	rm -rf ${dubbo-serialization}/lib
	rm -rf ${dubbo-consumer}/lib
	rm -rf ${dubbo-service}/lib
	rm -rf ${interpret-cli}/lib
	rm -rf ${interpret-util}/lib
	rm -rf ${zone-context}/lib
	@echo "clean success👏\n"

check:
	npx tsc -p ${dubbo-common}/tsconfig.json --noEmit
	npx tsc -p ${dubbo-registry}/tsconfig.json --noEmit
	npx tsc -p ${dubbo-serialization}/tsconfig.json --noEmit
	npx tsc -p ${dubbo-service}/tsconfig.json --noEmit
	npx tsc -p ${dubbo-consumer}/tsconfig.json --noEmit
	npx tsc -p ${interpret-cli}/tsconfig.json --noEmit
	npx tsc -p ${interpret-util}/tsconfig.json --noEmit
	npx tsc -p ${zone-context}/tsconfig.json --noEmit
	@echo "check success👏\n"

build-java-demo:
	cd ./java/dubbo-demo/dubbo-demo-api && mvn clean package
	cd ./java/dubbo-demo/dubbo-demo-api && mvn install dependency:copy-dependencies
	@echo "build java-demo success👏\n"

interpret-jar:build-demo-api
	ts-node ./packages/interpret-cli/src/cli.ts interpret -c dubbo.json
	@echo "interpret-jar success👏\n"



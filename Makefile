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

default: build-interpret-util dubbo-common dubbo-registry dubbo-serialization dubbo-service dubbo-consumer

clean-all: clean-dubbo-common clean-dubbo-registry clean-dubbo-registry clean-dubbo-serialization clean-dubbo-consumer clean-dubbo-service clean-interpret-util

dubbo-common: clean-dubbo-common
	npx tsc --project ./packages/dubbo-common/tsconfig.json
	@echo "👌 compile dubbo-common successfully \n"

clean-dubbo-common:
	rm -rf ./packages/dubbo-common/lib
	@echo "👌 clean dubbo-invoker successfully\n"

dubbo-registry: clean-dubbo-registry
	npx tsc --project ./packages/dubbo-registry/tsconfig.json
	@echo "👌 compile dubbo-registry successfully\n"

clean-dubbo-registry:
	rm -rf ./packages/dubbo-registry/lib
	@echo "👌 clean dubbo-registry successfully\n"

dubbo-serialization: clean-dubbo-serialization
	npx tsc --project ./packages/dubbo-serialization/tsconfig.json
	@echo "👌 compile dubbo-serialization successfully\n"

clean-dubbo-serialization:
	rm -rf ./packages/dubbo-serialization/lib
	@echo "👌 clean dubbo-serialization successfully\n"

dubbo-consumer: clean-dubbo-consumer
	npx tsc --project ./packages/dubbo-consumer/tsconfig.json
	@echo "👌 compile dubbo-consumer successfully\n"

clean-dubbo-consumer:
	rm -rf ./packages/dubbo-consumer/lib
	@echo "👌 clean dubbo-consumer successfully\n"

dubbo-service: clean-dubbo-service
	npx tsc --project ./packages/dubbo-service/tsconfig.json
	@echo "👌 compile dubbo-service successfully\n"

clean-dubbo-service:
	rm -rf ./packages/dubbo-service/lib
	@echo "👌 clean dubbo-service successfully\n"

build-interpret-util:clean-interpret-util
	npx tsc --project ./packages/interpret-util/tsconfig.json
	@echo "👌 compile interpret-util successfully\n"

clean-interpret-util:
	rm -rf ./packages/interpret-util/lib
	@echo "👌 clean interpret-util successfully\n"

build-demo-api:clean-demo-api
	cd ./java/dubbo-demo/dubbo-demo-api && mvn package
	cd ./java/dubbo-demo/dubbo-demo-api && mvn install dependency:copy-dependencies
	@echo "👌 build demo-api successfully\n"

interpret-jar:build-demo-api
	ts-node ./packages/interpret-cli/src/cli.ts interpret -c dubbo.json

# @apache/protoc-gen-dubbo-web

This package is deprecated.

The code generator `protoc-gen-dubbo-web` can now be used for Dubbo on the 
Web, and for Dubbo on Node.js.  
For a better fit, we have renamed it to `protoc-gen-dubbo-web` in 
[v0.0.1](https://github.com/apache/dubbo-js/releases/tag/v0.0.1). 

The generated code is actually exactly the same, so it is not necessary to 
update right away, but we are not going to maintain this package anymore.

Switching to [@apache/protoc-gen-dubbo-web](https://www.npmjs.com/package/@apache/protoc-gen-dubbo-web) 
is straight-forward:

```bash
npm remove @apache/protoc-gen-dubbo-web
npm install @apache/protoc-gen-dubbo-web
```

Update your `buf.gen.yaml`:

```diff
version: v1
plugins:
  - plugin: es
    out: src/gen
-  - plugin: connect-web
+  - plugin: connect-es
    out: src/gen
```

And your import paths:

```diff
- import { ElizaService } from "gen/eliza_connectweb";
+ import { ElizaService } from "gen/eliza_connect";
```


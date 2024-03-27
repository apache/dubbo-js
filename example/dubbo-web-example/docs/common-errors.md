# Common errors

This section introduces common errors encountered when using Dubbo-js in browser and their corresponding solutions.

## CORS issues arise in browser requests

Cross-origin issues stem from the Content Security Policy (CSP) of the browser, which prevents a page from properly handling responses when the browser sends a request whose URL differs in **scheme, domain, or port** from the target server's URL. For more detailed information, please refer to [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

To tackle this issue, our recommended approach is to configure CORS on the target server.

1. For a native Node.js server:
```typescript
import { createServer } from "http";
import { dubboNodeAdapter } from "@apachedubbo/dubbo-node";
import dubboRoutes from "./router";

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  // replace "dubbo" with your actual service group
  res.setHeader("Tri-Service-Group", "dubbo");
  // replace "1.0.0" with your actual service version
  res.setHeader("Tri-Service-Version", "1.0.0");

  // Handling the preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.end();
    return;
  }

  const handler = dubboNodeAdapter({
    routes: dubboRoutes
  });
  handler(req, res);
});

server.listen(8000, () => {
  console.log("\ndubbo-js server is running on http://localhost:8000...\n");
});
```
2. For servers employing Node.js frameworks, we have devised some more convenient solutions to certain frameworks:
- [express](/todo)
- [fastify](/todo)
- [next](/todo)

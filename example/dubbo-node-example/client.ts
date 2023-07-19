import { createPromiseClient } from "apache-dubbo";
import { ExampleService } from "./gen/example_dubbo";
import { createConnectTransport } from "apache-dubbo-node";

const transport = createConnectTransport({
  baseUrl: "http://localhost:8080",
  httpVersion: "1.1",
});

async function main() {
  const client = createPromiseClient(ExampleService, transport);
  const res = await client.say({ sentence: "Hello World" });
  console.log(res);
}
void main();
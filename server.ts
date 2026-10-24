import index from "./public/index.html";

const server = Bun.serve({
  // Loopback by default; set HOST=0.0.0.0 to serve other devices or a container.
  hostname: process.env.HOST || "localhost",
  port: Number(process.env.PORT) || 3000,
  // Opt-in only: development mode adds HMR, source maps and a DevTools
  // endpoint that reveals the project's absolute path on disk.
  development: process.env.NODE_ENV === "development",
  routes: {
    "/*": index,
  },
});

console.log(`Flappy Runs → ${server.url}`);

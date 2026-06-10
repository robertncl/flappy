import index from "./public/index.html";

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  development: process.env.NODE_ENV !== "production",
  routes: {
    "/*": index,
  },
});

console.log(`Flappy Runs → ${server.url}`);

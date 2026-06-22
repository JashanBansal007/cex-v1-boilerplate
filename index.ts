import app from "./src/app";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`CEX server running on port ${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error("Server failed to start:", err.message);
  }
  process.exit(1);
});

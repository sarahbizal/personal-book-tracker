import { app, corsOrigins } from "./app.js";

//|| instead of ?? so an empty PORT= also falls back to 3000
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`CORS allowed origins: ${corsOrigins.join(", ")}`);
});

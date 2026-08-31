import express, { type Express, type Request, type Response } from "express";

const app: Express = express();
const port = 3000;

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

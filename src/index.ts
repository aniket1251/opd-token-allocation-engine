import express from "express";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/errorHandler";
import { logDbStatus } from "./config/dbStatus";

/* ROUTE IMPORT */
import tokenRoutes from "./routes/tokenRoutes";
import slotRoutes from "./routes/slotRoutes";
import doctorRoutes from "./routes/doctorRoutes";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());

/* ROUTES */
app.get("/", (_req, res) => {
  res.send("This is the home route");
});
app.use("/api/tokens", tokenRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/doctors", doctorRoutes);

// always keep at the end
app.use(errorHandler);

/* SERVER */
const port = Number(process.env.PORT) || 8001;
async function startServer() {
  await logDbStatus();

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer();

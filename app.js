import express from "express";
import pkg from "pg";
import { Pool } from "pg";


const port = process.env.PORT;

const pool = new Pool({
  user: process.env.USER,
  host: "localhost",
  database: "SmartRoads",
  password: "2014",
  port: "5432",
});

const app = express();

app.get("/", (req, res) => {
  res.send("App running!");
});

app.listen(port, () => console.log(`Server listenig to port ${port}`));

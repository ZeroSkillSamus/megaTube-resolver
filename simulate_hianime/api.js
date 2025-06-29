/** @format */

import express from "express";
import bodyParser from "body-parser";
import fetch_video_src from "./index.js";

const HIANIME = express();
const port = 3000;

HIANIME.listen(port, async () => {
  console.log(`Opening On Port: ${port}`);
});

HIANIME.get("/ZORO/Fetch-Video/:episode_id", async (req, res) => {
  let { episode_id } = req.params;
  let results = await fetch_video_src(episode_id);
  return res.send(JSON.stringify(results, null, 4));
});

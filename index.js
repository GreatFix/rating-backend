const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { User, Target, Feedback, Response } = require("./src/sequelize");
const cors = require("cors");
var { DateTime, Settings } = require("luxon");

app.use(cors());
app.use(bodyParser.json());
Settings.defaultLocale = "Europe/Moscow";
Settings.defaultZoneName = "Europe/Moscow";

app.get("/", (req, res) => {
  res.status(200).send("Launched");
});

app.listen(process.env.PORT || 5000, function () {
  console.log("Listening on " + process.env.PORT || 5000);
});

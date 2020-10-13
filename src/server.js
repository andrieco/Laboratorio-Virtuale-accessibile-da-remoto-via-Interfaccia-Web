
const express = require("express");
const serverPort = process.env.SERVER_PORT;
const userRouter = require("./routers/user");
const vmRouter = require("./routers/vm");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("./db/db");

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(userRouter);
app.use(vmRouter);
app.use(express.static("site"));

app.listen(serverPort, function() {
    console.log("Listening on port " + serverPort);
});

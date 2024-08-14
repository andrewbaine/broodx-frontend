let createError = require("http-errors");
let express = require("express");
let path = require("path");
let cookieParser = require("cookie-parser");
let session = require("express-session");
let csrf = require("csurf");
let passport = require("passport");
let logger = require("morgan");

const RedisStore = require("connect-redis").default;
const redis = require("redis");

// Initialize client.
let redisClient = redis.createClient();
redisClient.connect().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Initialize store.
let redisStore = new RedisStore({
  client: redisClient,
  prefix: "myapp:",
});

var indexRouter = require("./routes/index");
var authRouter = require("./routes/auth");
let app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(logger(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    store: redisStore,
    resave: false, // required: force lightweight session keep alive (touch)
    saveUninitialized: false, // recommended: only save session when data exists
    secret: process.env.SESSION_SECRET,
    cookie: {
      secure: true,
    },
  }),
);
app.use(csrf());
app.use(passport.authenticate("session"));
app.use(function (req, res, next) {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !!msgs.length;
  req.session.messages = [];
  next();
});
app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use("/", indexRouter);
app.use("/", authRouter);

app.get("/ready", (req, res, next) => {
  pool.query("SELECT now()", (err, result) => {
    if (err) {
      return next(err);
    }
    res.sendStatus(200);
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;

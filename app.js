let crypto = require("crypto");
let passport = require("passport");
let createError = require("http-errors");
let express = require("express");

let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");

let indexRouter = require("./routes/index");
let usersRouter = require("./routes/users");

let app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (_, res) => res.render("login"));

let LocalStrategy = require("passport-local");

let strategy = new LocalStrategy(function verify(username, password, cb) {
  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    function (err, user) {
      if (err) {
        return cb(err);
      }
      if (!user) {
        return cb(null, false, { message: "Incorrect username or password." });
      }

      crypto.pbkdf2(
        password,
        user.salt,
        310000,
        32,
        "sha256",
        function (err, hashedPassword) {
          if (err) {
            return cb(err);
          }
          if (!crypto.timingSafeEqual(user.hashed_password, hashedPassword)) {
            return cb(null, false, {
              message: "Incorrect username or password.",
            });
          }
          return cb(null, user);
        },
      );
    },
  );
});

passport.use(strategy);

app.post(
  "/login/password",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  function (req, res) {
    res.redirect("/dashboard");
  },
);

app.use("/", indexRouter);
app.use("/users", usersRouter);

app.get("/ready", (req, res, next) => {
  pool.query("SELECT now()", (err, result) => {
    if (err) {
      return next(err);
    }
    console.log(result);
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

console.log("PGHOST", process.env.PGHOST);

let pg = require("pg");
let pool = new pg.Pool();
const client = new pg.Client();

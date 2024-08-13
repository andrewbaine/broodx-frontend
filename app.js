let crypto = require("crypto");
let passport = require("passport");
let createError = require("http-errors");
let express = require("express");

let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");

let indexRouter = require("./routes/index");
let usersRouter = require("./routes/users");

let LocalStrategy = require("passport-local");

const bcrypt = require("bcrypt");
const saltRounds = 10;

let pg = require("pg");
let pool = new pg.Pool();

let strategy = new LocalStrategy(function verify(email, password, cb) {
  pool.query(
    "SELECT id, hashed_password FROM users WHERE email = ?",
    [email],
    function (err, result) {
      if (err) {
        return cb(err);
      }
      let rows = result.rows;
      if (rows.length === 0) {
        return cb(null, false, { message: "Incorrect email or password." });
      }
      if (rows.length === 1) {
        let user = rows[0];
        bcrypt.compare(password, user.hashed_password, (err, authenticated) => {
          if (err) {
            return cb(err);
          }
          if (!authenticated) {
            return cb(null, false, {
              message: "Incorrect email or password.",
            });
          }
          return cb(null, user.id);
        });
      }
      return cb(
        new Error("impossible to have more than one row in the database."),
      );
    },
  );
});

passport.use(strategy);
const async = require("async");
let transaction = (pool, f, cb) => {
  pool.connect((err, client) => {
    if (err) {
      return cb(err);
    }
    let c = (err) =>
      client.query("ROLLBACK", (e2) => {
        client.release();
        cb(e2 || err);
      });

    client.query("BEGIN", (err) => {
      if (err) {
        return c(err);
      }
      return f(client, (err, result) => {
        if (err) {
          return c(err);
        }
        client.query("COMMIT", (err) => {
          if (err) {
            return c(err);
          }
          client.release();
          return cb(err, result);
        });
      });
    });
  });
};

let app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (_, res) => res.render("login"));
app.get("/register", (_, res) => res.render("register"));
app.post("/register", (req, res, next) => {
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    if (err) {
      return next(err);
    }
    transaction(
      pool,
      (client, cb) => {
        client.query(
          "INSERT INTO users(email, hashed_password) VALUES ($1, $2)",
          [req.username, hash],
          cb,
        );
      },
      (err, x) => {
        if (err) {
          return next(err);
        }
        console.log("user id is", x);
        return res.redirect("/login");
      },
    );
  });
});
app.get("/ready", (req, res, next) => {
  pool.query("SELECT now()", (err, result) => {
    if (err) {
      return next(err);
    }
    res.sendStatus(200);
  });
});

app.post(
  "/login/password",
  passport.authenticate("local", {
    failureRedirect: "/login-retry",
    failureMessage: true,
  }),
  function (req, res) {
    res.redirect("/dashboard");
  },
);

app.use("/", indexRouter);
app.use("/users", usersRouter);

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

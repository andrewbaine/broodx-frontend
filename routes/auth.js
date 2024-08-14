let bcrypt = require("bcrypt");

let express = require("express");
let passport = require("passport");
let LocalStrategy = require("passport-local");

let urlencoded = require("../urlencoded");
const saltRounds = 10;

passport.use(
  new LocalStrategy(function verify(email, password, cb) {
    pool.query(
      "SELECT id, hashed_password FROM users WHERE email = $1",
      [email],
      function (err, result) {
        if (err) {
          return cb(err);
        }
        let rows = result.rows;

        if (rows.length === 0) {
          return cb(null, false, { message: "Incorrect email or password." });
        } else if (rows.length === 1) {
          let user = rows[0];
          return bcrypt.compare(
            password,
            user.hashed_password,
            (err, authenticated) => {
              if (err) {
                return cb(err);
              }
              if (!authenticated) {
                return cb(null, false, {
                  message: "Incorrect email or password.",
                });
              }
              return cb(null, user);
            },
          );
        } else {
          return cb(
            new Error("impossible to have more than one row in the database."),
          );
        }
      },
    );
  }),
);

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, email: user.email });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

let router = express.Router();

router.get("/login", (_, res) => res.render("login"));

router.post(
  "/login",
  urlencoded,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  function (req, res) {
    res.redirect("/dashboard");
  },
);

router.post("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.get("/register", (_, res) => res.render("register"));

router.post("/register", urlencoded, (req, res, next) => {
  let { username, password } = req.body;
  console.log("todo: validate username and password");
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      return next(err);
    }
    pool.query(
      "INSERT INTO users(email, hashed_password) VALUES ($1, $2) RETURNING id",
      [username, hash],
      (err, result) => {
        if (err) {
          return next(err);
        }
        let id = result.rows[0].id;
        console.log("the new user id is", id);
        req.login(user, function (err) {
          if (err) {
            return next(err);
          }
          res.redirect("/registration-successful");
        });
      },
    );
  });
});

module.exports = router;


let pg = require("pg");
let pool = new pg.Pool();

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

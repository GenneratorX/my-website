const mariadb = require('mariadb');
const pool = mariadb.createPool({host: 'localhost', user: 'web', password: 'KappaPride*123', database: 'website', connectionLimit: 5, rowsAsArray: true});

module.exports = {query};

async function query(qry, param=[]) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(qry, param);
    return rows;
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.end();
  }
}

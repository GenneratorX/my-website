const mariadb = require('mariadb');
const pool = mariadb.createPool({host: 'localhost', user: 'gennerator', socketPath: '/var/run/mysqld/mysqld.sock', database: 'website', connectionLimit: 5, rowsAsArray: true});

module.exports = {query};

/**
 * Querries the database
 * @param {string} qry Query string
 * @param {string[]} param Query parameters
 * @return {Promise<any>} Query result
 */
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

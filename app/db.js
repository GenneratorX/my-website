const pg = require('pg');
const pool = new pg.Pool({host: '/var/run/postgresql', max: 20});

module.exports = {query};

/**
 * Querries the database
 * @param {string} qry Query string
 * @param {string[]} param Query parameters
 * @param {string} qname Query name
 * @return {Promise<any>} Query result
 */
async function query(qry, param=[], qname='') {
  let conn;
  try {
    conn = await pool.connect();
    const res = await conn.query({
      text: qry,
      values: param,
      rowMode: 'array',
      name: qname,
    });
    return res.rows;
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.release();
  }
}

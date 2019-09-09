'use strict';

import pg = require('pg');
const pool = new pg.Pool({host: '/var/run/postgresql', max: 50});

/**
 * Querries the database
 * @param qry Query string
 * @param param Query parameters
 * @return Query result
 */
export async function query(qry: string, param?: any[]): Promise<any[][]|null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let conn: pg.PoolClient|undefined;
  try {
    conn = await pool.connect();
    const res = await conn.query({
      text: qry,
      values: param,
      rowMode: 'array',
    });
    return res.rows;
  } catch (err) {
    console.log(err);
    return null;
  } finally {
    if (conn) conn.release();
  }
}

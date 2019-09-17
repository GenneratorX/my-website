'use strict';

import pg = require('pg');
const pool = new pg.Pool({ host: '/var/run/postgresql', max: 50 });

/**
 * Querries the database
 * @param qry Query string
 * @param param Query parameters
 * @return Query result
 */
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query(qry: string, param?: any[]): Promise<any[][]> {
  let conn: pg.PoolClient | undefined;
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
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

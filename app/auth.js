const argon = require('argon2');
const db = require('./db');

module.exports = {createUser, loginUser};

async function hash(pass) {
  return argon.hash(pass, {
    type: argon.argon2d,
    hashLength: 128,
    timeCost: 10,
    memoryCost: 32768,
    parallelism: 8,
    raw: false,
    saltLength: 32,
  });
}

async function createUser(usr, pass, uType = 1, uActive = 0) {
  const hPass = await hash(pass);
  if (await db.query('SELECT COUNT(usr) FROM usr WHERE usr = ?;', [usr]) == 0) {
    await db.query('INSERT INTO usr VALUES (NULL, ?, ?, ?, ?, DEFAULT, ?);', [usr, hPass, uType, new Date(), uActive]);
    return true;
  } else {
    return false;
  }
}

async function loginUser(usr, pass) {
  const u = await db.query('SELECT pass FROM usr WHERE usr = ?;', [usr]);
  if (u[0] && await argon.verify(u.toString(), pass)) {
    if (await db.query('SELECT COUNT(usr) FROM usr WHERE usr = ? AND active = 1;', [usr]) == 1) {
      return 0;
    } else {
      return 1;
    }
  } else {
    return 2;
  }
}

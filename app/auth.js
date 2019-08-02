const argon = require('argon2');
const db = require('./db');

module.exports = {createUser, loginUser, usernameExists};

/**
 * Hashes the input using argon2d
 * @param {string} pass String to be hashed
 * @return {Promise<string>} The hashed input
 */
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

/**
 * Adds user to database
 * @param {string} usr Username
 * @param {string} pass Password
 * @param {number} uType Account type [0|1]
 * @param {number} uActive Enabled/Disabled account [0|1]
 * @return {Promise<boolean>} True if successful, false otherwise
 */
async function createUser(usr, pass, uType = 1, uActive = 0) {
  const hPass = hash(pass);
  if (await db.query('SELECT COUNT(usr) FROM usr WHERE usr = ?;', [usr]) == 0) {
    await db.query('INSERT INTO usr VALUES (NULL, ?, ?, ?, ?, DEFAULT, ?);', [usr, await hPass, uType, new Date(), uActive]);
    return true;
  }
  return false;
}

/**
 * Authenticates user
 * @param {string} usr Username
 * @param {string} pass Password
 * @return {Promise<number>} Success(0) / Disabled(1) / Failed(2)
 */
async function loginUser(usr, pass) {
  const u = await db.query('SELECT pass FROM usr WHERE usr = ?;', [usr]);
  if (u[0] && await argon.verify(u.toString(), pass)) {
    if (await db.query('SELECT COUNT(usr) FROM usr WHERE usr = ? AND active = 1;', [usr]) == 1) {
      return 0;
    } else {
      return 1;
    }
  }
  return 2;
}

/**
 * Checks if user exists
 * @param {string} usr Username
 * @return {Promise<boolean>} True if exists, false otherwise
 */
async function usernameExists(usr) {
  if (await db.query('SELECT COUNT(usr) FROM usr WHERE usr = ?;', [usr]) == 1) {
    return true;
  }
  return false;
}

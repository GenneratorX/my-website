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
 * @return {Promise<boolean|string>} True if successful, error string otherwise
 */
async function createUser(usr, pass, uType = 1, uActive = 0) {
  if (usr.length >= 6 && usr.length <= 40 && pass.length >= 8 && pass.length <= 100) {
    if (! await usernameExists(usr)) {
      await db.query('INSERT INTO usr VALUES (NULL, ?, ?, ?, ?, DEFAULT, ?);', [usr, await hash(pass), uType, new Date(), uActive]);
      return true;
    } else {
      return 'USER_EXISTS';
    }
  }
  return 'USER_PASSWORD_NOT_VALID';
}

/**
 * Authenticates user
 * @param {string} usr Username
 * @param {string} pass Password
 * @return {Promise<boolean|string>} True if successful, error string otherwise
 */
async function loginUser(usr, pass) {
  if (usr.length >= 6 && usr.length <= 40 && pass.length >= 8 && pass.length <= 100) {
    const u = await db.query('SELECT pass FROM usr WHERE usr = ?;', [usr]);
    if (u[0] && await argon.verify(u.toString(), pass)) {
      if (await db.query('SELECT COUNT(usr) FROM usr WHERE usr = ? AND active = 1;', [usr]) == 1) {
        return true;
      } else {
        return 'USER_DISABLED';
      }
    } else {
      return 'USER_PASSWORD_NOT_FOUND';
    }
  }
  return 'USER_PASSWORD_NOT_VALID';
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

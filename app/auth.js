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
 * @param {number} [uType=1] Account type [0 - Admin | 1 - User]
 * @param {number} [uActive=0] Enabled/Disabled account [0 - Disabled | 1 - Enabled]
 * @return {Promise<boolean|string>} True if the user was created, error string otherwise
 */
async function createUser(usr, pass, uType = 1, uActive = 0) {
  if (usr.length >= 6 && usr.length <= 40 && pass.length >= 8 && pass.length <= 100 && await passwordCheck(pass)) {
    if (! await usernameExists(usr)) {
      await db.query('INSERT INTO users VALUES (DEFAULT, $1, $2, $3, $4, DEFAULT, $5);', [usr, await hash(pass), uType, uActive, new Date()]);
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
 * @return {Promise<boolean|string>} True if the login was successful, error string otherwise
 */
async function loginUser(usr, pass) {
  if (usr.length >= 6 && usr.length <= 40 && pass.length >= 8 && pass.length <= 100) {
    const u = await db.query('SELECT password, active FROM users WHERE LOWER(username) = LOWER($1);', [usr]);
    if (u[0]) {
      if (u[0][1] == true) {
        if (await argon.verify(u[0][0], pass)) {
          db.query('UPDATE users SET lastlogin = CURRENT_TIMESTAMP WHERE LOWER(username) = LOWER($1)', [usr]);
          return true;
        } else {
          return 'USER_PASSWORD_NOT_FOUND';
        }
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
 * @return {Promise<boolean>} True if the username exists, false otherwise
 */
async function usernameExists(usr) {
  const u = await db.query('SELECT COUNT(username) FROM users WHERE LOWER(username) = LOWER($1);', [usr]);
  if (u[0] && u[0][0] == 1) {
    return true;
  }
  return false;
}

/**
 * Checks if the password requirements are met
 * @param {string} pass Password
 * @return {boolean} True if password is valid, false otherwise
 */
async function passwordCheck(pass) {
  let mare = false;
  let mica = false;
  let cifra = false;
  let special = false;
  for (let i = 0; i < pass.length; i++) {
    const c = pass.charAt(i);
    if (mare && mica && cifra && special) {
      return true;
    } else {
      if (!mare && c >= 'A' && c <= 'Z') {
        mare = true;
        continue;
      }
      if (!mica && c >= 'a' && c <= 'z') {
        mica = true;
        continue;
      }
      if (!cifra && c >= '0' && c <= '9') {
        cifra = true;
        continue;
      }
      if (!special && (c < 'A' || c > 'Z') && (c < 'a' || c > 'z') && (c < '0' || c > '9')) {
        special = true;
      }
    }
  }
  if (mare && mica && cifra && special) {
    return true;
  }
  return false;
}

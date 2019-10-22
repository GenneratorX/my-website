'use strict';

import argon2 = require('argon2');
import crypto = require('crypto');
import querystring = require('querystring');
import nodemailer = require('nodemailer');
import hbs = require('nodemailer-express-handlebars');

import * as env from '../env';
import * as db from './db';
import * as util from './util';

const MIN_USERNAME_LENGTH = 6;
const MAX_USERNAME_LENGTH = 40;
const MIN_PASSWORD_LENGTH = 8;

const userRegexp = /^[a-zA-Z\d][a-zA-Z\d!?$^&*._-]{5,39}$/;
const emailRegexp = new RegExp(
  '^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&\'*+/0-9=?A-Z^_`a-z{|}~]+(\\.[-!#$%&\'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]' +
  '([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$');

const transporter = nodemailer.createTransport({
  service: env.EMAIL_SERVICE,
  secure: true,
  auth: {
    user: env.EMAIL_USERNAME,
    pass: env.EMAIL_PASSWORD,
  },
});

transporter.use('compile', hbs({
  viewEngine: {
    layoutsDir: 'app/views/emails/',
    partialsDir: 'app/views/emails/',
  },
  viewPath: 'app/views/emails',
}));

/**
 * Adds user to database
 * @param usr Username
 * @param pass Password
 * @param email E-mail address
 * @param uType Account type [0 - Admin | 1 - User]
 * @param uActive Enabled/Disabled account [0 - Disabled | 1 - Enabled]
 * @return True if the user was created, error string otherwise
 */
export async function createUser(
  usr: string, pass: string, email: string, uType = 1, uActive = 0): Promise<boolean | string> {
  if (userRegexp.test(usr) && passwordCheck(pass) && emailRegexp.test(email)) {
    if (!(await usernameExists(usr))) {
      if (!(await emailExists(email))) {
        const hash = argon2.hash(pass, {
          type: argon2.argon2d,
          hashLength: 128,
          saltLength: 32,
          memoryCost: 32768,
          timeCost: 10,
          parallelism: 8,
          raw: false,
        });
        await db.query(
          'INSERT INTO users VALUES (DEFAULT, $1, $2, LOWER($3), $4, $5, DEFAULT, $6);',
          [usr, await hash, email, uType, uActive, new Date()]
        );
        crypto.randomBytes(128, (e, b) => {
          if (!e) {
            const actCode = b.toString('base64');
            db.query(
              'INSERT INTO users_activation VALUES ((SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)), $2)',
              [usr, actCode]
            );
            transporter.sendMail({
              from: `"Gennerator" <${env.EMAIL_USERNAME}>`,
              to: `<${email.toLowerCase()}>`,
              replyTo: `"Contact" <${env.EMAIL_REPLYTO}>`,
              subject: 'Confirmă contul creat',
              template: 'userActivation',
              context: {
                userName: usr,
                greetingMessage: util.greetingMessage(),
                activationCode: querystring.escape(actCode),
              },
            });
          } else {
            console.log(e);
          }
        });
        return true;
      } else {
        return 'EMAIL_EXISTS';
      }
    } else {
      return 'USER_EXISTS';
    }
  }
  return 'USER_PASSWORD_EMAIL_NOT_VALID';
}

/**
 * Authenticates the user
 * @param usr Username
 * @param pass Password
 * @return True if the login was successful, error string otherwise
 */
export async function loginUser(usr: string, pass: string): Promise<boolean | string> {
  if (usr.length >= MIN_USERNAME_LENGTH && usr.length <= MAX_USERNAME_LENGTH && pass.length >= MIN_PASSWORD_LENGTH) {
    const u = await db.query('SELECT password, active FROM users WHERE LOWER(username) = LOWER($1);', [usr]);
    if (u && u[0]) {
      if (u[0][1] === true) {
        if (await argon2.verify(u[0][0], pass)) {
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
 * Activates the user account
 * @param activationKey Activation key
 * @return True if the activation was successful, false otherwise
 */
export async function enableUser(activationKey: string): Promise<boolean> {
  const u = await db.query('SELECT user_id FROM users_activation WHERE activation_key = $1;', [activationKey]);
  if (u && u[0] && u[0][0]) {
    db.query('UPDATE users SET active = true WHERE user_id = $1', [u[0][0]]);
    db.query('DELETE FROM users_activation WHERE user_id = $1', [u[0][0]]);
    return true;
  }
  return false;
}

/**
 * Checks if the username exists in the database
 * @param usr Username
 * @return True if the username exists, false otherwise
 */
export async function usernameExists(usr: string): Promise<boolean> {
  const u = await db.query('SELECT COUNT(username) FROM users WHERE LOWER(username) = LOWER($1);', [usr]);
  if (u && u[0] && u[0][0] === '1') {
    return true;
  }
  return false;
}

/**
 * Checks if the email exists in the database
 * @param email Email address
 * @return True if the email address exists, false otherwise
 */
export async function emailExists(email: string): Promise<boolean> {
  const u = await db.query('SELECT COUNT(email) FROM users WHERE LOWER(email) = LOWER($1);', [email]);
  if (u && u[0] && u[0][0] === '1') {
    return true;
  }
  return false;
}

/**
 * Checks if the password requirements are met
 * @param pass Password
 * @return True if password is valid, false otherwise
 */
function passwordCheck(pass: string): boolean {
  let uppercase = false;
  let lowercase = false;
  let digit = false;
  let special = false;
  if (pass.length >= MIN_PASSWORD_LENGTH) {
    for (let i = 0; i < pass.length; i++) {
      const c = pass.charAt(i);
      if (uppercase && lowercase && digit && special) {
        return true;
      } else {
        if (!uppercase && c >= 'A' && c <= 'Z') {
          uppercase = true;
          continue;
        }
        if (!lowercase && c >= 'a' && c <= 'z') {
          lowercase = true;
          continue;
        }
        if (!digit && c >= '0' && c <= '9') {
          digit = true;
          continue;
        }
        if (!special && (c < 'A' || c > 'Z') && (c < 'a' || c > 'z') && (c < '0' || c > '9')) {
          special = true;
        }
      }
    }
  }
  if (uppercase && lowercase && digit && special) {
    return true;
  }
  return false;
}

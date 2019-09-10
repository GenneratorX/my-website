'use strict';

import argon2 = require('argon2');
import crypto = require('crypto');
import querystring = require('querystring');
import nodemailer = require('nodemailer');

import * as env from '../env';
import * as db from './db';
import * as util from './util';

const userRegexp = /^[a-zA-Z\d][a-zA-Z\d!?$^&*._-]{5,39}$/;
const emailRegexp = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

const transporter = nodemailer.createTransport({
  service: env.EMAIL_SERVICE,
  secure: true,
  auth: {
    user: env.EMAIL_USERNAME,
    pass: env.EMAIL_PASSWORD,
  },
});

/**
 * Adds user to database
 * @param usr Username
 * @param pass Password
 * @param email E-mail address
 * @param uType Account type [0 - Admin | 1 - User]
 * @param uActive Enabled/Disabled account [0 - Disabled | 1 - Enabled]
 * @return True if the user was created, error string otherwise
 */
export async function createUser(usr: string, pass: string, email: string, uType = 1, uActive = 0): Promise<boolean | string> {
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
        await db.query('INSERT INTO users VALUES (DEFAULT, $1, $2, LOWER($3), $4, $5, DEFAULT, $6);', [usr, await hash, email, uType, uActive, new Date()]);
        crypto.randomBytes(128, (e, b) => {
          if (!e) {
            const actCode = b.toString('base64');
            db.query('INSERT INTO users_activation VALUES ((SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)), $2)', [usr, actCode]);
            transporter.sendMail({
              from: `"Gennerator" <${env.EMAIL_USERNAME}>`,
              to: `"${usr}" <${email.toLowerCase()}>`,
              replyTo: `"Contact" <${env.EMAIL_REPLYTO}>`,
              subject: 'Confirmă contul creat',
              html: `<!DOCTYPE html><html lang="ro" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml"><head><title>Bine ai venit!</title><!--[if !mso]><!-- --><meta content="IE=edge" http-equiv="X-UA-Compatible"><!--<![endif]--><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"><meta content="width=device-width,initial-scale=1" name="viewport"><style>#outlook a{padding:0}.ExternalClass,.ReadMsgBody{width:100%}.ExternalClass *{line-height:100%}body{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;margin:0;padding:0}table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:0;text-decoration:none}p{display:block;margin:13px 0}</style><!--[if !mso]><!--><style>@media only screen and (max-width:480px){@-ms-viewport{width:320px}@viewport{width:320px}}</style><!--<![endif]--><!--[if mso]><xml><o:officedocumentsettings><o:allowpng><o:pixelsperinch>96</o:pixelsperinch></o:officedocumentsettings></xml><![endif]--><!--[if lte mso 11]><style>.outlook-group-fix{width:100%!important}</style><![endif]--><style>@media only screen and (min-width:6in){.mj-column-per-100{max-width:100%;width:100%!important}}</style></head><body style="background-color:#232323"><div style="color:#fff;display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Activează contul creat</div><div style="background-color:#232323"><!--[if mso | IE]><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:600px" width="600"><tr><td style="font-size:0;line-height:0;mso-line-height-rule:exactly"><![endif]--><div style="background:#363636;background-color:#363636;margin:0 auto;max-width:600px"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#363636;background-color:#363636;width:100%" align="center"><tbody><tr><td style="direction:ltr;font-size:0;padding:20px 0;text-align:center;vertical-align:top"><!--[if mso | IE]><table border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="vertical-align:top;width:600px"><![endif]--><div style="direction:ltr;display:inline-block;font-size:13px;text-align:left;vertical-align:top;width:100%" class="mj-column-per-100 outlook-group-fix"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top" width="100%"><tr><td style="font-size:0;padding:10px 25px;word-break:break-word" align="left"><div style="color:#fff;font-family:Helvetica;font-size:23px;font-weight:200;line-height:1;text-align:left">${util.greetingMessage()}, <b>${usr}</b>!</div></td></tr><tr><td style="font-size:0;padding:10px 25px;word-break:break-word"><p style="border-top:solid 4px #232323;font-size:1;margin:0 auto;width:100%"></p><!--[if mso | IE]><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:solid 4px #232323;font-size:1;margin:0 auto;width:550px" align="center" width="550px"><tr><td style="height:0;line-height:0"></td></tr></table><![endif]--></td></tr><tr><td style="font-size:0;padding:10px 25px;word-break:break-word" align="left"><div style="color:#fff;font-family:Helvetica;font-size:23px;font-weight:200;line-height:1;text-align:left">Apasă butonul de mai jos pentru a activa contul!</div></td></tr><tr><td style="font-size:0;padding:10px 25px;word-break:break-word" align="center" vertical-align="middle"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%"><tr><td style="background:#232323;border:0;border-radius:3px;cursor:auto;padding:10px 25px" align="center" bgcolor="#232323" role="presentation" valign="middle"><a href="https://gennerator.com/activate?act=${querystring.escape(actCode)}" style="background:#232323;color:#fff;font-family:Helvetica;font-size:23px;font-weight:700;line-height:120%;margin:0;text-decoration:none;text-transform:none" target="_blank">ACTIVARE</a></td></tr></table></td></tr></table></div><!--[if mso | IE]><![endif]--></td></tr></tbody></table></div><!--[if mso | IE]><![endif]--></div></body></html>`,
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
  if (usr.length >= 6 && usr.length <= 40 && pass.length >= 8 && pass.length <= 100) {
    const u = await db.query('SELECT password, active FROM users WHERE LOWER(username) = LOWER($1);', [usr]);
    if (u && u[0]) {
      if (u[0][1] == true) {
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
  if (u && u[0] && u[0][0] == '1') {
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
  if (u && u[0] && u[0][0] == '1') {
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
  if (pass.length >= 8) {
    for (let i = 0; i < pass.length; i++) {
      const c = pass.charAt(i);
      if (uppercase && lowercase && digit && special && length) {
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

/** @preserve login.js */
'use strict';

const /** Element */ submitForm = document.getElementById('auth');

const /** Element */ createAcc = document.getElementById('createAcc');
const /** Element */ forgotPass = document.getElementById('forgotPass');
const /** Element */ lText = document.getElementById('lText');

const /** Element */ userBox = document.getElementById('username');
const /** Element */ passBox = document.getElementById('password');

const /** string */ green = 'login lGreen';
const /** string */ red = 'login lRed';
const /** string */ gray = 'login';

let /** Element */ repeatBox;
let /** Element */ emailBox;
let /** Element */ checkLabel;
let /** boolean */ repeatBoxEnabled = false;

const /** RegExp */ emailRegexp = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

forgotPass.onclick = function() {
  snackbar('Asta e! 🤷‍♂️');
};

createAcc.onclick = function() {
  if (!repeatBoxEnabled) {
    const /** Element */ repeatPass = document.createElement('input');
    setAttributes(repeatPass, {
      'class': 'login',
      'id': 'repeatPassword',
      'autocomplete': 'new-password',
      'maxlength': '100',
      'placeholder': 'Repetă parola',
      'required': '',
      'tabindex': '3',
      'type': 'password',
    });

    const /** Element */ email = document.createElement('input');
    setAttributes(email, {
      'class': 'login',
      'id': 'email',
      'autocomplete': 'email',
      'maxlength': '254',
      'name': 'email',
      'placeholder': 'E-mail',
      'required': '',
      'tabindex': '4',
      'type': 'email',
      'spellcheck': 'false',
    });

    const /** Element */ chkLabel = document.createElement('label');
    setAttributes(chkLabel, {
      'class': 'checkbox-label',
      'id': 'chkLabel',
      'tabindex': '5',
    });
    chkLabel.textContent = 'Accept termenii și condițiile';

    const /** Element */ chkBox = document.createElement('input');
    setAttributes(chkBox, {
      'id': 'chkBox',
      'name': 'chkBox',
      'required': '',
      'type': 'checkbox',
    });

    const /** Element */ submitButton = document.getElementById('submitB');
    submitForm.insertBefore(repeatPass, submitButton);
    submitForm.insertBefore(email, submitButton);
    submitForm.insertBefore(chkLabel, submitButton);
    chkLabel.insertAdjacentElement('afterbegin', chkBox);

    setAttributes(passBox, {'autocomplete': 'new-password'});
    setAttributes(submitForm, {'action': 'createUser'});

    lText.textContent = 'Creare cont';
    createAcc.textContent = 'Ai cont? Loghează-te!';

    checkLabel = document.getElementById('chkLabel');

    repeatBox = document.getElementById('repeatPassword');
    repeatBox.onkeyup = function() {
      if (passBox.className == green) {
        if (passBox.value == repeatBox.value) {
          repeatBox.className = green;
        } else {
          repeatBox.className = red;
        }
      } else {
        repeatBox.className = gray;
      }
    };

    emailBox = document.getElementById('email');
    emailBox.onkeyup = function() {
      if (emailRegexp.test(emailBox.value)) {
        emailBox.className = green;
      } else {
        if (emailBox.value.length != 0) {
          emailBox.className = red;
        } else {
          emailBox.className = gray;
        }
      }
    };

    emailBox.onblur = function() {
      if (emailBox.className == green) {
        xhr('POST', '/emailExists', {'email': emailBox.value}, function(r) {
          if (r == 'true') {
            emailBox.className = red;
          }
        });
      }
    };

    emailBox.onkeydown = function(e) {
      if (e.which == 32 || e.key == '>' || e.key == '<') {
        e.preventDefault();
      }
    };

    repeatBoxEnabled = true;

    userBox.onblur();
  } else {
    removeCreateUser();
  }
};

userBox.onkeyup = function() {
  if (userBox.value.length >= 6 && userBox.value.length <= 40) {
    userBox.className = green;
  } else {
    if (userBox.value.length != 0) {
      userBox.className = red;
    } else {
      userBox.className = gray;
    }
  }
};

userBox.onblur = function() {
  userBox.value = userBox.value.replace(/[\s<>]/g, '');
  if (repeatBoxEnabled) {
    if (userBox.className == green) {
      xhr('POST', '/usernameExists', {'username': userBox.value}, function(r) {
        if (r == 'true') {
          userBox.className = red;
        }
      });
    }
  } else {
    userBox.onkeyup();
  }
};

userBox.onkeydown = function(e) {
  if (e.which == 32 || e.key == '>' || e.key == '<') {
    e.preventDefault();
  }
};

passBox.onkeyup = function() {
  if (passBox.value.length >= 8 && passBox.value.length <= 100 && passCheck(passBox.value) == true) {
    passBox.className = green;
    if (repeatBoxEnabled) {
      repeatBox.onkeyup(null);
    }
  } else {
    if (passBox.value.length != 0) {
      passBox.className = red;
    } else {
      passBox.className = gray;
      if (repeatBoxEnabled) {
        repeatBox.onkeyup(null);
      }
    }
  }
};

submitForm.addEventListener('submit', function(/** Event */ e) {
  if (userBox.className == green) {
    if (passBox.className == green) {
      if (repeatBoxEnabled) {
        if (repeatBox.className == green) {
          if (emailBox.className == green) {
            xhr('POST', '/createUser', {'username': userBox.value, 'password': passBox.value, 'email': emailBox.value, 'policy': document.getElementById('chkBox').checked}, function(r) {
              removeCreateUser();
              submitForm.reset();
              userBox.className = gray;
              passBox.className = gray;
              snackbar('Cont creat cu succes!');
            });
          } else {
            if (emailRegexp.test(emailBox.value)) {
              snackbar('Adresa e-mail există deja!', 2);
            } else {
              snackbar('Adresa e-mail nu este validă!', 2);
            }
          }
        } else {
          if (repeatBox.value != passBox.value) {
            snackbar('Parolele trebuie să fie identice!', 2);
          }
        }
      } else {
        xhr('POST', '/loginUser', {'username': userBox.value, 'password': passBox.value}, function(r) {
          switch (r) {
            case 'USER_DISABLED': snackbar('Contul este dezactivat! Verifică adresa de e-mail înregistrată pentru activarea contului.', 3); break;
            case 'USER_PASSWORD_NOT_FOUND': snackbar('Numele de utilizator sau parola sunt incorecte!', 2); break;
            default:
              document.body.innerHTML = r;
              setTimeout(function() {
                window.location.href = '/';
              }, 3000);
          }
        });
      }
    } else {
      if (passBox.value.length >= 8 && passBox.value.length <= 100) {
        const chk = passCheck(passBox.value);
        let /** string */ err = 'Parola trebuie să conțină cel puțin:\n';
        if (!chk[0]) err += '- un caracter minuscul\n';
        if (!chk[1]) err += '- un caracter majuscul\n';
        if (!chk[2]) err += '- o cifră\n';
        if (!chk[3]) err += '- un caracter special\n';
        snackbar(err, 2);
      } else {
        snackbar('Parola trebuie să conțină minimum 8 caractere!', 2);
      }
    }
  } else {
    if (userBox.value.length >= 6 && userBox.value.length <= 40) {
      if (repeatBoxEnabled) {
        snackbar('Numele de utilizator există deja!', 2);
      }
    } else {
      snackbar('Numele de utilizator trebuie să conțină minimum 6 caractere!', 2);
    }
  }
  e.preventDefault();
});

/**
 * Checks if the password requirements are met
 * @param {string} str Password
 * @return {boolean|Array<boolean>} True if password is valid, boolean array with all check results
 */
function passCheck(str) {
  let /** boolean */ mare = false;
  let /** boolean */ mica = false;
  let /** boolean */ cifra = false;
  let /** boolean */ special = false;
  for (let i = 0; i < str.length; i++) {
    const /** string */ c = str.charAt(i);
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
  return [mare, mica, cifra, special];
}

/**
 * Removes the password repeat input box
 */
function removeCreateUser() {
  lText.parentNode.removeChild(repeatBox);
  lText.parentNode.removeChild(emailBox);
  lText.parentNode.removeChild(checkLabel);

  repeatBoxEnabled = false;

  setAttributes(passBox, {'autocomplete': 'current-password'});
  setAttributes(submitForm, {'action': 'loginUser'});

  lText.textContent = 'Login';
  createAcc.textContent = 'Nu ai cont? Creează unul!';

  userBox.onblur();
}

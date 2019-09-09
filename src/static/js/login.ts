/** @preserve login.js */
'use strict';

const submitForm = (document.getElementById('auth') as HTMLFormElement);

const userBox = (document.getElementById('username') as HTMLInputElement);
const passBox = (document.getElementById('password') as HTMLInputElement);

const createAcc = (document.getElementById('createAcc') as HTMLAnchorElement);
const forgotPass = (document.getElementById('forgotPass') as HTMLAnchorElement);
const lText = (document.getElementById('lText') as HTMLParagraphElement);

let repeatBox: HTMLInputElement;
let emailBox: HTMLInputElement;
let checkLabel: HTMLLabelElement;
let repeatBoxEnabled = false;

const green = 'login lGreen';
const red = 'login lRed';
const gray = 'login';

const userRegexp = /^[a-zA-Z\d][a-zA-Z\d!?$^&*._-]{5,39}$/;
const emailRegexp = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

forgotPass.onclick = function(): void {
  snackbar('Asta e! 🤷‍♂️', 0);
};

createAcc.onclick = function(): void {
  if (!repeatBoxEnabled) {
    const repeatPass = document.createElement('input');
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

    const email = document.createElement('input');
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

    const chkLabel = document.createElement('label');
    setAttributes(chkLabel, {
      'class': 'checkbox-label',
      'id': 'chkLabel',
      'tabindex': '5',
    });
    chkLabel.textContent = 'Accept termenii și condițiile';

    const chkBox = document.createElement('input');
    setAttributes(chkBox, {
      'id': 'chkBox',
      'name': 'chkBox',
      'required': '',
      'type': 'checkbox',
    });

    const submitButton = (document.getElementById('submitB') as HTMLInputElement);

    submitForm.insertBefore(repeatPass, submitButton);
    submitForm.insertBefore(email, submitButton);
    submitForm.insertBefore(chkLabel, submitButton);
    chkLabel.insertAdjacentElement('afterbegin', chkBox);

    setAttributes(passBox, {'autocomplete': 'new-password'});
    setAttributes(submitForm, {'action': 'createUser'});

    lText.textContent = 'Creare cont';
    createAcc.textContent = 'Ai cont? Loghează-te!';

    repeatBox = (document.getElementById('repeatPassword') as HTMLInputElement);
    emailBox = (document.getElementById('email') as HTMLInputElement);
    checkLabel = (document.getElementById('chkLabel') as HTMLLabelElement);

    repeatBox.onkeyup = repeatBoxKeyUp;
    emailBox.onkeyup = emailBoxKeyUp;
    emailBox.onblur = emailBoxBlur;
    emailBox.onkeydown = emailBoxKeyDown;

    repeatBoxEnabled = true;
    userBox.blur();
  } else {
    removeCreateUser();
  }
};

userBox.onkeyup = userBoxKeyUp;
userBox.onblur = userBoxBlur;
userBox.onkeydown = userBoxKeyDown;
passBox.onkeyup = passBoxKeyUp;

// EventHandler functions

function userBoxKeyUp(): void {
  if (userRegexp.test(userBox.value)) {
    userBox.className = green;
  } else {
    if (userBox.value.length != 0) {
      userBox.className = red;
    } else {
      userBox.className = gray;
    }
  }
}

function userBoxKeyDown(e: KeyboardEvent): void {
  if (e.which == 32) {
    e.preventDefault();
  }
}

function userBoxBlur(): void {
  if (repeatBoxEnabled) {
    if (userBox.className == green) {
      xhr('POST', '/usernameExists', {'username': userBox.value}, function(r) {
        if (r == 'true') {
          userBox.className = red;
        }
      });
    }
  } else {
    userBoxKeyUp();
  }
}

function passBoxKeyUp(): void {
  if (passCheck(passBox.value) == true) {
    passBox.className = green;
    if (repeatBoxEnabled) {
      repeatBoxKeyUp();
    }
  } else {
    if (passBox.value.length != 0) {
      passBox.className = red;
    } else {
      passBox.className = gray;
      if (repeatBoxEnabled) {
        repeatBoxKeyUp();
      }
    }
  }
}

function repeatBoxKeyUp(): void {
  if (passBox.className == green) {
    if (passBox.value == repeatBox.value) {
      repeatBox.className = green;
    } else {
      repeatBox.className = red;
    }
  } else {
    repeatBox.className = gray;
  }
}

function emailBoxKeyUp(): void {
  if (emailRegexp.test(emailBox.value)) {
    emailBox.className = green;
  } else {
    if (emailBox.value.length != 0) {
      emailBox.className = red;
    } else {
      emailBox.className = gray;
    }
  }
}

function emailBoxBlur(): void {
  if (emailBox.className == green) {
    xhr('POST', '/emailExists', {'email': emailBox.value}, function(r) {
      if (r == 'true') {
        emailBox.className = red;
      }
    });
  }
}

function emailBoxKeyDown(e: KeyboardEvent): void {
  if (e.which == 32) {
    e.preventDefault();
  }
}

submitForm.addEventListener('submit', function(e) {
  if (userBox.className == green) {
    if (passBox.className == green) {
      if (repeatBoxEnabled) {
        if (repeatBox.className == green) {
          if (emailBox.className == green) {
            xhr('POST', '/createUser', {'username': userBox.value, 'password': passBox.value, 'email': emailBox.value, 'policy': (document.getElementById('chkBox') as HTMLInputElement).checked}, function(r) {
              if (r != 'RATE_LIMIT') {
                removeCreateUser();
                submitForm.reset();
                userBox.className = gray;
                passBox.className = gray;
                snackbar('Cont creat cu succes!', 0);
              } else {
                snackbar('Mai încet gogule! Ia o pauză și încearcă mai târziu!', 2);
              }
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
            case 'RATE_LIMIT': snackbar('Mai încet gogule! Ia o pauză și încearcă mai târziu!', 2); break;
            default:
              document.body.innerHTML = r;
              setTimeout(function() {
                window.location.href = '/';
              }, 3000);
          }
        });
      }
    } else {
      const chk = passCheck(passBox.value);
      if (!chk) {
        if (!chk[0]) {
          snackbar('Parola trebuie să conțină minim 8 caractere!', 2);
        } else {
          let err = 'Parola trebuie să conțină cel puțin:\n';
          if (!chk[1]) err += '- un caracter majuscul\n';
          if (!chk[2]) err += '- un caracter minuscul\n';
          if (!chk[3]) err += '- o cifră\n';
          if (!chk[4]) err += '- un caracter special\n';
          snackbar(err, 2);
        }
      }
    }
  } else {
    if (userRegexp.test(userBox.value)) {
      if (repeatBoxEnabled) {
        snackbar('Numele de utilizator există deja!', 2);
      }
    } else {
      snackbar('Numele de utilizator trebuie să conțină minim 6 caractere și să înceapă cu un caracter alfanumeric. Simbolurile acceptate sunt: !?$^&*._-', 2);
    }
  }
  e.preventDefault();
});

/**
 * Checks if the password requirements are met
 * @param pass The password
 * @return True if password is valid, boolean array with all check results otherwise
 */
function passCheck(pass: string): true | boolean[] {
  let length = false;
  let uppercase = false;
  let lowercase = false;
  let digit = false;
  let special = false;
  if (pass.length >= 8) {
    length = true;
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
  return [length, uppercase, lowercase, digit, special];
}

/**
 * Removes the inputs used for creating an account
 */
function removeCreateUser(): void {
  submitForm.removeChild(repeatBox);
  submitForm.removeChild(emailBox);
  submitForm.removeChild(checkLabel);

  repeatBoxEnabled = false;

  setAttributes(passBox, {'autocomplete': 'current-password'});
  setAttributes(submitForm, {'action': 'loginUser'});

  lText.textContent = 'Login';
  createAcc.textContent = 'Nu ai cont? Creează unul!';

  userBox.blur();
}

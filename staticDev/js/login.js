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
let /** boolean */ repeatBoxEnabled = false;

forgotPass.onclick = function() {
  snackbar('Asta e! 🤷‍♂️');
};

createAcc.onclick = function() {
  if (!repeatBoxEnabled) {
    const /** Element */ repeatPass = document.createElement('input');
    setAttributes(repeatPass, {'class': 'login', 'id': 'repeatPassword', 'autocomplete': 'new-password', 'maxlength': 100, 'placeholder': 'Repetă parola', 'type': 'password'});
    repeatPass.required = true;
    setAttributes(passBox, {'autocomplete': 'new-password'});

    setAttributes(submitForm, {'action': 'createUser'});
    submitForm.insertBefore(repeatPass, document.getElementById('submitB'));
    repeatBoxEnabled = true;

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

    lText.textContent = 'Creare cont';
    createAcc.textContent = 'Ai cont? Loghează-te!';

    userBox.onblur();
  } else {
    removeRepeatBox();
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
  if (repeatBoxEnabled) {
    if (userBox.className == green) {
      xhr('POST', '/usernameExists', {username: userBox.value}, function(r) {
        if (r == 'true') {
          userBox.className = red;
        }
      });
    }
  } else {
    userBox.onkeyup();
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
  if (userBox.value.length >= 6 && userBox.value.length <= 40) {
    if (passBox.value.length >= 8 && passBox.value.length <= 100) {
      if (passCheck(passBox.value) == true) {
        if (repeatBoxEnabled) {
          if (passBox.value == repeatBox.value) {
            xhr('POST', '/createUser', {username: userBox.value, password: passBox.value}, function(r) {
              if (r == 'true') {
                removeRepeatBox();
                submitForm.reset();
                userBox.className = gray;
                passBox.className = gray;
                snackbar('Cont creat cu succes!');
              } else {
                snackbar('Numele de utilizator există deja!', 2);
              }
            });
          } else {
            snackbar('Parolele trebuie să fie identice!', 2);
          }
        } else {
          xhr('POST', '/loginUser', {username: userBox.value, password: passBox.value}, function(r) {
            switch (r) {
              case 'USER_DISABLED': snackbar('Contul este dezactivat! Spunei lui Gennerator și rezolvă el.', 3); break;
              case 'USER_PASSWORD_NOT_FOUND': snackbar('Numele de utilizator sau parola sunt incorecte!', 2); break;
              default: {
                document.body.innerHTML = r;
                setTimeout(function() {
                  window.location.href = '/';
                }, 3000);
                break;
              }
            }
          });
        }
      } else {
        let /** string */ err = 'Parola trebuie să conțină cel puțin:\n';
        if (!containsLowercase(passBox.value)) err += '- un caracter minuscul\n';
        if (!containsUppercase(passBox.value)) err += '- un caracter majuscul\n';
        if (!containsDigit(passBox.value)) err += '- o cifră\n';
        if (!containsSpecial(passBox.value)) err += '- un caracter special\n';
        snackbar(err, 2);
      }
    } else {
      snackbar('Parola trebuie să conțină minimum 8 caractere!', 2);
    }
  } else {
    snackbar('Numele de utilizator trebuie să conțină minimum 6 caractere!', 2);
  }
  e.preventDefault();
});

/**
 * Checks if the password requirements are met
 * @param {string} str Password
 * @return {boolean} True if password is valid, false otherwise
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
  return false;
}

/**
 * Removes the password repeat input box
 */
function removeRepeatBox() {
  lText.parentNode.removeChild(repeatBox);
  repeatBoxEnabled = false;

  setAttributes(passBox, {'autocomplete': 'current-password'});
  setAttributes(submitForm, {'action': 'loginUser'});

  lText.textContent = 'Login';
  createAcc.textContent = 'Nu ai cont? Creează unul!';

  userBox.onblur();
}

/** Dummy function that is not touched by Closure Compiler that acts as a split point to separate the bundle in 2 files */
window.placeholder = function() {};

const submitForm = document.getElementById('auth');

const createAcc = document.getElementById('createAcc');
const forgotPass = document.getElementById('forgotPass');
const lText = document.getElementById('lText');

const userBox = document.getElementById('username');
const passBox = document.getElementById('password');

const green = 'login lGreen';
const red = 'login lRed';
const gray = 'login';

let repeatBox;


forgotPass.onclick = function() {
  console.log('Asta e! ^_^');
};

createAcc.onclick = function() {
  if (!repeatBox) {
    const repeatPass = document.createElement('input');
    setAttributes(repeatPass, {'class': 'login', 'id': 'repeatPassword', 'autocomplete': 'new-password', 'maxlength': 100, 'placeholder': 'Repetă parola', 'type': 'password'});
    repeatPass.required = true;
    setAttributes(passBox, {'autocomplete': 'new-password'});

    setAttributes(submitForm, {'action': 'createUser'});
    submitForm.insertBefore(repeatPass, document.getElementById('submitB'));

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

function removeRepeatBox() {
  lText.parentNode.removeChild(repeatBox);
  repeatBox = undefined;

  setAttributes(passBox, {'autocomplete': 'current-password'});
  setAttributes(submitForm, {'action': 'loginUser'});

  lText.textContent = 'Login';
  createAcc.textContent = 'Nu ai cont? Creează unul!';

  userBox.onblur();
}

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
  if (repeatBox) {
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
  if (passBox.value.length >= 8 && passBox.value.length <= 100) {
    passBox.className = green;
    if (repeatBox) {
      repeatBox.onkeyup(null);
    }
  } else {
    if (passBox.value.length != 0) {
      passBox.className = red;
    } else {
      passBox.className = gray;
      if (repeatBox) {
        repeatBox.onkeyup(null);
      }
    }
  }
};

submitForm.addEventListener('submit', function(e) {
  if (userBox.value.length >= 6 && userBox.value.length <= 40) {
    if (passBox.value.length >= 8 && passBox.value.length <= 100) {
      if (repeatBox) {
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
      snackbar('Parola trebuie să conțină minimum 8 caractere!', 2);
    }
  } else {
    snackbar('Numele de utilizator trebuie să conțină minimum 6 caractere!', 2);
  }
  e.preventDefault();
});

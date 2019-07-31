const createAcc = document.getElementById('createAcc');
const forgotPass = document.getElementById('forgotPass');
const lText = document.getElementById('lText');

const userBox = document.getElementById('username');
const passBox = document.getElementById('password');

const green = 'login lGreen';
const red = 'login lRed';
const gray = 'login';

forgotPass.onclick = function() {
  console.log('Asta e! ^_^');
};

createAcc.onclick = function() {
  if (!document.getElementById('repeatPassword')) {
    const repeatPass = document.createElement('input');
    repeatPass.required = true;
    setAttributes(repeatPass, {'class': 'login', 'maxlength': 100, 'placeholder': 'Repetă parola', 'type': 'password', 'id': 'repeatPassword'});

    const form = document.getElementById('auth');
    setAttributes(form, {'action': 'createUser'});
    form.insertBefore(repeatPass, document.getElementById('submit'));

    const repeatBox = document.getElementById('repeatPassword');
    repeatBox.onkeyup = function() {
      if (repeatBox.value.length >= 8 && repeatBox.value.length <= 100) {
        if (passBox.value == repeatBox.value) {
          repeatBox.className = green;
        } else {
          repeatBox.className = red;
        }
        passBox.onblur();
      } else {
        if (repeatBox.value.length == 0) {
          repeatBox.className = gray;
        } else {
          repeatBox.className = red;
        }
      }
    };

    lText.textContent = 'Creare cont';
    createAcc.textContent = 'Ai cont? Loghează-te!';

    userBox.onblur();
  } else {
    lText.parentNode.removeChild(document.getElementById('repeatPassword'));

    setAttributes(document.getElementById('auth'), {'action': 'loginUser'});

    lText.textContent = 'Login';
    createAcc.textContent = 'Nu ai cont? Creează unul!';

    userBox.onblur();
    passBox.onblur();
  }
};

userBox.onkeyup = function() {
  if (userBox.value.length >= 6 && userBox.value.length <= 40) {
    userBox.className = green;
  } else {
    if (userBox.value.length == 0) {
      userBox.className = gray;
    } else {
      userBox.className = red;
    }
  }
};

userBox.onblur = function() {
  if (userBox.value.length >= 6 && userBox.value.length <= 40) {
    if (document.getElementById('repeatPassword')) {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/usernameExists', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({
        username: userBox.value,
      }));
      xhr.onload = function(e) {
        if (this.response == 'true') {
          userBox.className = red;
        } else {
          userBox.className = green;
        }
      };
      userBox.className = green;
    } else {
      userBox.className = green;
    }
  } else {
    if (userBox.value.length == 0) {
      userBox.className = gray;
    } else {
      userBox.className = red;
    }
  }
};

passBox.onkeyup = function() {
  if (passBox.value.length >= 8 && passBox.value.length <= 100) {
    if (document.getElementById('repeatPassword')) {
      const repeatBox = document.getElementById('repeatPassword');
      if (passBox.value == repeatBox.value) {
        passBox.className = green;
      }
      repeatBox.onkeyup(null);
    } else {
      passBox.className = green;
    }
  } else {
    if (passBox.value.length == 0) {
      passBox.className = gray;
    } else {
      passBox.className = red;
    }
  }
};

passBox.onblur = function() {
  if (passBox.value.length >= 8 && passBox.value.length <= 100) {
    if (document.getElementById('repeatPassword')) {
      const repeatBox = document.getElementById('repeatPassword');
      if (passBox.value == repeatBox.value) {
        passBox.className = green;
      }
    } else {
      passBox.className = green;
    }
  } else {
    if (passBox.value.length == 0) {
      passBox.className = gray;
    } else {
      passBox.className = red;
    }
  }
};

document.getElementById('auth').onsubmit = function(e) {
  if (userBox.value.length >= 6 && userBox.value.length <= 40 && passBox.value.length >= 8 && passBox.value.length <= 100) {
    if (document.getElementById('repeatPassword')) {
      const repeatBox = document.getElementById('repeatPassword');
      if (passBox.value == repeatBox.value) {
        console.log('totu e bine!');
      } else {
        console.log('parolele nu corespund!');
      }
    } else {
      console.log('totu e bine!');
      e.submit();
    }
  } else {
    console.log('username sau parola nu is destul de lungi!');
  }
  e.preventDefault();
};

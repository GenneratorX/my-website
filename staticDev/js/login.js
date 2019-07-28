const createAcc = document.getElementById('createAcc');
const forgotPass = document.getElementById('forgotPass');
const lText = document.getElementById('lText');

const userBox = document.getElementById('username');
const passBox = document.getElementById('password');

forgotPass.onclick = function() {
  console.log('Asta e! ^_^');
};

createAcc.onclick = function() {
  if (!document.getElementById('repeatPassword')) {
    const repeatpass = document.createElement('input');
    setAttributes(repeatpass, {'class': 'login', 'maxlength': 100, 'placeholder': 'Repetă parola', 'type': 'password', 'id': 'repeatPassword'});
    repeatpass.required = true;

    const c = document.getElementById('auth');
    setAttributes(c, {'action': 'createUser'});
    c.insertBefore(repeatpass, document.getElementById('submit'));

    const repeatBox = document.getElementById('repeatPassword');
    repeatBox.onkeyup = function() {
      if (repeatBox.value.length >= 8 && repeatBox.value.length <= 100) {
        if (repeatBox.value == passBox.value) {
          repeatBox.className = 'login lGreen';
        } else {
          repeatBox.className = 'login lRed';
        }
      } else {
        repeatBox.className = 'login lRed';
      }
    };

    lText.textContent = 'Creare cont';
    createAcc.textContent = 'Ai cont? Loghează-te!';
  } else {
    lText.parentNode.removeChild(document.getElementById('repeatPassword'));

    setAttributes(document.getElementById('auth'), {'action': 'loginUser'});

    lText.textContent = 'Login';
    createAcc.textContent = 'Nu ai cont? Creează unul!';
  }
};

userBox.onkeyup = function() {
  if (userBox.value.length >= 6 && userBox.value.length <= 40) {
    userBox.className = 'login lGreen';
  } else {
    userBox.className = 'login lRed';
  }
};

passBox.onkeyup = function() {
  if (passBox.value.length >= 8 && passBox.value.length <= 100) {
    passBox.className = 'login lGreen';
  } else {
    passBox.className = 'login lRed';
  }
};

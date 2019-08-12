/* eslint-disable no-unused-vars */
const /** Element */ link=document.createElement('link');
link.rel='stylesheet',
link.href='/css/style.css',
document.head.appendChild(link);

if (document.readyState !== 'loading') {
  selectButton();
} else {
  document.addEventListener('DOMContentLoaded', function() {
    selectButton();
  });
}

/**
 * Gives a ribbon button the 'selected' look based on the current path
 */
function selectButton() {
  const /** string */ b = window.location.pathname.substring(1);
  if (document.getElementById(b)) document.getElementById(b).className+=' selected';
}

/**
 * Sets attributes on a HTML element
 * @param {Element} elem HTML element
 * @param {Object.<string, string>} attr Object containing attribute names and its values
 */
function setAttributes(elem, attr) {
  for (const /** string */ n in attr) {
    if (!elem.hasOwnProperty(n)) {
      elem.setAttribute(n, attr[n]);
    }
  }
}

/**
 * Sends an XMLHttpRequest to the server
 * @param {string} method HTTP method to use (eg. GET/POST)
 * @param {string} url URL to send the request to
 * @param {Object.<string, string>} req Data to send
 * @param {function(*):void} cb Callback
 */
function xhr(method, url, req, cb) {
  const /** XMLHttpRequest */ xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(req));
  xhr.onload = function() {
    cb(xhr.response);
  };
}

/**
 * Displays a snackbar notification
 * @param {string} msg Snackbar message
 * @param {number} type Snackbar color [0 - green | 1 - orange | 2 - red | 3 - blue]
 */
function snackbar(msg, type = 0) {
  const /** Element */ snackB = document.createElement('div');
  snackB.setAttribute('id', 'snackbar');
  const /** Element */ snackC = document.createElement('div');
  snackC.setAttribute('id', 'snackC');
  snackC.textContent = msg;
  switch (type) {
    case 0: snackC.className = 'green'; break;
    case 1: snackC.className = 'orange'; break;
    case 2: snackC.className = 'red'; break;
    case 3: snackC.className = 'blue'; break;
  }
  snackB.appendChild(snackC);
  document.body.appendChild(snackB);
  snackB.className = 'show';
  setTimeout(function() {
    snackB.className = '';
    snackB.parentNode.removeChild(snackB);
  }, 3000);
}

/**
 * Checks if string contains a digit
 * @param {string} str String to be checked
 * @return {boolean} True if string contains a digit, false otherwise
 */
function containsDigit(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) >= '0' && str.charAt(i) <= '9') {
      return true;
    }
  }
  return false;
}

/**
 * Checks if string contains a lowercase letter
 * @param {string} str String to be checked
 * @return {boolean} True if string contains a lowercase letter, false otherwise
 */
function containsLowercase(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) >= 'a' && str.charAt(i) <= 'z') {
      return true;
    }
  }
  return false;
}

/**
 * Checks if string contains an uppercase letter
 * @param {string} str String to be checked
 * @return {boolean} True if string contains an uppercase letter, false otherwise
 */
function containsUppercase(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) >= 'A' && str.charAt(i) <= 'Z') {
      return true;
    }
  }
  return false;
}

/**
 * Checks if string contains a special character
 * @param {string} str String to be checked
 * @return {boolean} True if string contains a special character, false otherwise
 */
function containsSpecial(str) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i);
    if ((c < 'A' || c > 'Z') && (c < 'a' || c > 'z') && (c < '0' || c > '9')) {
      return true;
    }
  }
  return false;
}

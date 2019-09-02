/* eslint-disable no-unused-vars */
/** @preserve script.js */
'use strict';

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

if (document.getElementById('hamburger')) {
  const /** Element */ ribbon = document.getElementById('myRibbon');
  document.getElementById('hamburger').onclick = function() {
    if (ribbon.className == 'ribbon') {
      ribbon.className += ' responsive';
    } else {
      ribbon.className = 'ribbon';
    }
  };
}

/**
 * Sets attributes on a HTML element
 * @param {Element} elem HTML element
 * @param {Object.<string, string>} attr Object containing attribute names and its values
 */
function setAttributes(elem, attr) {
  for (const /** string */ n in attr) {
    if (!Object.prototype.hasOwnProperty.call(elem, n)) {
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
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.send(JSON.stringify(req));
  xhr.onload = function() {
    cb(xhr.response);
  };
}

/**
 * Displays a snackbar notification
 * @param {string} msg Snackbar message
 * @param {number} [type=0] Snackbar color [0 - green | 1 - orange | 2 - red | 3 - blue]
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
  }, 4000);
}

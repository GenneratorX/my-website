const link=document.createElement('link');
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

function selectButton() {
  const b = window.location.pathname.substring(1);
  if (document.getElementById(b)) document.getElementById(b).className+=' selected';
}

function setAttributes(elem, attr) {
  for (const n in attr) {
    if (!elem.hasOwnProperty(n)) {
      elem.setAttribute(n, attr[n]);
    }
  }
}

function xhr(method, url, req, cb) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(req));
  xhr.onload = function() {
    cb(xhr.response);
  };
}

function snackbar(msg, type = 0) {
  const snackB = document.createElement('div');
  snackB.setAttribute('id', 'snackbar');
  const snackC = document.createElement('div');
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

window['setAttributes'] = setAttributes;
window['xhr'] = xhr;
window['snackbar'] = snackbar;

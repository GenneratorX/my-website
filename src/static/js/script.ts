/* eslint-disable @typescript-eslint/no-unused-vars */
'use strict';

/**
 * Load any preloaded CSS asynchronously and with the main CSS always last
 */
const links = document.head.getElementsByTagName('link');
for (let i = links.length - 1; i >= 0; i--) {
  if (links[i].as === 'style') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = links[i].getAttribute('href') as string;
    document.head.appendChild(link);
  }
}

const b = window.location.pathname.substring(1);
if (document.getElementById(b)) (document.getElementById(b) as HTMLAnchorElement).className += ' selected';

const hamburger = document.getElementById('hamburger') as HTMLAnchorElement;
if (hamburger) {
  const ribbon = document.getElementById('myRibbon') as HTMLElement;
  if (ribbon) {
    hamburger.onclick = function(): void {
      if (ribbon.className === 'ribbon') {
        ribbon.className += ' responsive';
      } else {
        ribbon.className = 'ribbon';
      }
    };
  }
}

/**
 * Sets attributes on a HTML element
 * @param elem HTML element
 * @param attr Object containing attribute names and their values
 */
function setAttributes(elem: HTMLElement, attr: { [property: string]: string }): void {
  for (const n in attr) {
    if (!Object.prototype.hasOwnProperty.call(elem, n)) {
      elem.setAttribute(n, attr[n]);
    }
  }
}

/**
 * Sends a fetch request to the server
 * @param method HTTP method to use (eg. GET/POST)
 * @param url URL to send the request to
 * @param req Data to send
 */
function fetcH(
  method: 'GET' | 'POST', url: string, req: { [property: string]: string | number | boolean }):
  Promise<{ [property: string]: string | number | boolean }> {
  return fetch(url, {
    method: method,
    mode: 'same-origin',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(req),
  }).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.status.toString());
  });
}

/**
 * Sends a fetch request to another origin
 * @param url URL to send the request to
 */
function fetchCORS(url: string): Promise<{ [property: string]: string | number | boolean }> {
  return fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
  }).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.status.toString());
  });
}

/**
 * Displays a snackbar notification
 * @param msg Snackbar message
 * @param type Snackbar color [0 - green | 1 - orange | 2 - red | 3 - blue]
 */
function snackbar(msg: string, type: 0 | 1 | 2 | 3): void {
  const snackB = document.createElement('div');
  snackB.setAttribute('id', 'snackbar');
  const snackC = document.createElement('div');
  snackC.setAttribute('id', 'snackC');
  snackC.textContent = msg;
  switch (type) {
    case 0:
      snackC.className = 'green';
      break;
    case 1:
      snackC.className = 'orange';
      break;
    case 2:
      snackC.className = 'red';
      break;
    case 3:
      snackC.className = 'blue';
      break;
  }
  snackB.appendChild(snackC);
  document.body.appendChild(snackB);
  snackB.className = 'show';
  setTimeout(function() {
    if (snackB && snackB.parentNode) {
      snackB.className = '';
      snackB.parentNode.removeChild(snackB);
    }
  }, 4000);
}

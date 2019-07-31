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

window['setAttributes'] = setAttributes;

const link=document.createElement('link');
link.rel='stylesheet',
link.href='/css/style.css',
document.head.appendChild(link);

window.addEventListener('DOMContentLoaded', function() {
  const b = window.location.pathname.substring(1);
  if (document.getElementById(b)) document.getElementById(b).className+=' selected';
}, false);

function setAttributes(elem, attr) {
  for (const n in attr) {
    if (!elem.hasOwnProperty(n)) {
      elem.setAttribute(n, attr[n]);
    }
  }
}
window['setAttributes'] = setAttributes;

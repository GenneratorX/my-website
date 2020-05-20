# My NodeJS Website

[![Website](https://img.shields.io/website/https/gennerator.com?style=flat-square)](https://gennerator.com)
[![MozillaObservatory](https://img.shields.io/mozilla-observatory/grade-score/gennerator.com?publish&style=flat-square)](https://observatory.mozilla.org/analyze/gennerator.com)
[![HSTSPreload](https://img.shields.io/hsts/preload/gennerator.com?style=flat-square)](https://hstspreload.org/?domain=gennerator.com)
[![TravisCI](https://img.shields.io/travis/genneratorx/my-website?style=flat-square)](https://travis-ci.com/GenneratorX/my-website)
[![LGTM](https://img.shields.io/lgtm/grade/javascript/github/GenneratorX/my-website?style=flat-square)](https://lgtm.com/projects/g/GenneratorX/my-website)
[![CodeFactor.io](https://www.codefactor.io/repository/github/genneratorx/my-website/badge)](https://www.codefactor.io/repository/github/genneratorx/my-website)
[![DeepScan grade](https://deepscan.io/api/teams/5387/projects/7168/branches/67642/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5387&pid=7168&bid=67642)
[![BCH compliance](https://bettercodehub.com/edge/badge/GenneratorX/my-website?branch=master)](https://bettercodehub.com/)

**This is my personal website written in JavaScript(NodeJS). The purpose of this is to learn something useful and to enjoy myself.**

* * *

<p align="center">:warning::construction::construction: :construction_worker: :construction::construction::warning:</p>
<p align="center"><b>Everything below this point is under construction. Don't forget your safety helmet!</b></p>
<p align="center">:warning::construction::construction: :construction_worker: :construction::construction::warning:</p>

* * *

## Security measures

*  Allow only **GET(HEAD)** and **POST** HTTP methods using NGINXs **limit_except** directive. These methods are available **only when required**. (eg. POST method is allowed only on routes defined with **app.post** in **app.ts**)
*  **CSRF protection** by:
	* accepting **only valid JSON** from requests (parsing is done with **JSON.parse()**)
	* validating '**Content-Type**' header from requests and accepting **only** '**Content-Type: application/json**'
	* not allowing **CORS** by **disabling** the **OPTIONS method** on all routes (any CORS preflight requests will fail)
	* setting the **Content-Security-Policy** **object-src** directive to **none** and **not using** a **crossdomain.xml** file to mitigate Flash based exploits
	* using **tough** cookies with:
		*  **SameSite** attribute set to **Strict**
		* **Secure** attribute
		* **HTTPOnly** attribute
		* **__Host** prefix

*  **XSS protection** by:
	* using a safe **Content-Security-Policy**
		* allowing execution of inline scripts/styles and outline scripts **only** if they are supplied with a **nonce**
		* allowing execution of outline styles only if they are from the **same origin**
	* sending the header '**X-XSS-Protection: 1; mode=block**' on every request
	* **escaping HTML values** with Handlebars
	* sanitizing user submited values using backend logic

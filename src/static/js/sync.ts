/** @preserve sync.js */
'use strict';

const a = document.createElement('script');
a.id = 'www-widgetapi-script';
a.src = 'https://s.ytimg.com/yts/jsbin/www-widgetapi-vflgu2Ceb/www-widgetapi.js';
a.async = true;
document.head.appendChild(a);

const userListLabel = document.getElementById('userListLabel') as HTMLDivElement;
const userList = document.getElementById('chatUsers') as HTMLDivElement;
const chat = document.getElementById('chat-box') as HTMLDivElement;
const messageBox = document.getElementById('messageBox') as HTMLInputElement;

let initial = false;
let retryCounter = 0;
const maxRetries = 5;

let userCount = 0;

/**
 * Connect to the WebSocket Server
 */
function connect(): void {
  const ws = new WebSocket('wss://gennerator.com/ws');
  let interval: NodeJS.Timeout;

  ws.onopen = function(): void {
    if (initial) {
      snackbar('Conexiunea a fost restabilită!', 0);
    } else {
      initial = true;
    }

    // Clean the user list
    while (userList.firstChild) {
      userList.removeChild(userList.firstChild);
    }

    interval = setInterval(function() {
      if (ws.readyState > 1 && retryCounter < maxRetries) {
        connect();
        retryCounter++;
      }
    }, 35000);
    retryCounter = 0;
  };

  ws.onmessage = function(message): void {
    handleMessage(message.data);
  };

  ws.onclose = function(): void {
    if (retryCounter < maxRetries) {
      snackbar(`S-a pierdut conexiunea la server! Încercăm reconectarea - ${retryCounter + 1}`, 3);
      clearInterval(interval);
      setTimeout(function() {
        connect();
        retryCounter++;
      }, 2000);
    }
  };

  messageBox.onkeyup = function(key): void {
    if (key.keyCode === 13) {
      ws.send(messageBox.value.replace(/\s+/g, ' ').trim());
      messageBox.value = '';
    }
  };
}

messageBox.onfocus = function(): void {
  messageBox.placeholder = '';
};

messageBox.onblur = function(): void {
  messageBox.placeholder = 'Mesajul tău...';
};

/**
 * Processes a WebSocket message
 * @param message The message
 */
function handleMessage(message: string): void {
  const json = JSON.parse(message);
  if (json['event'] != 'userList') {
    const msg = document.createElement('div');
    const username = document.createElement('span');
    setAttributes(msg, { 'class': 'message' });
    setAttributes(username, { 'class': `bold ${json['usernameColor']}` });
    switch (json['event']) {
      case 'userMessage':
        username.textContent = json['username'] + ': ';
        msg.textContent = json['message'];
        break;
      case 'userConnect':
        username.textContent = json['username'];
        msg.textContent = ' s-a conectat!';
        msg.className += ' bold';

        userListAdd(json['username'], json['usernameColor']);
        userCountUpdate(++userCount);
        break;
      case 'userDisconnect':
        username.textContent = json['username'];
        msg.textContent = ' s-a deconectat!';
        msg.className += ' bold';
        userListRemove(json['username']);
        userCountUpdate(--userCount);
        break;
    }
    chat.appendChild(msg);
    msg.insertAdjacentElement('afterbegin', username);
    msg.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } else {
    for (let i = 0; i < json['usernames'].length; i++) {
      userListAdd(json['usernames'][i], json['usersColor'][i]);
    }
    userCount = json['usernames'].length;
    userCountUpdate(userCount);
  }
}

/**
 * Adds an user to the user list
 * @param username Username to add
 * @param usernameColor The username color of the user
 */
function userListAdd(username: string, usernameColor: string): void {
  const user = document.createElement('div');
  user.textContent = username;
  user.className = 'bold message ' + usernameColor;
  userList.appendChild(user);
}

/**
 * Removes an user from the user list
 * @param username Username to remove
 */
function userListRemove(username: string): void {
  for (let i = 0; i < userList.childNodes.length; i++) {
    if (userList.childNodes[i].textContent == username) {
      userList.removeChild(userList.childNodes[i]);
    }
  }
}

/**
 * Updates the user count
 * @param count The number of users
 */
function userCountUpdate(count: number): void {
  userListLabel.textContent = `Utilizatori conectați (${count})`;
}

let player: YT.Player;

function onYoutubeIframeAPIReady(): void {
  player = new YT.Player('player', {
    videoId: '5ZosFi-IzRU',
    playerVars: {
      'start': 0,
      'enablejsapi': 1,
      'origin': 'https://gennerator.com',
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
    },
  });
}

function onPlayerReady(event: YT.PlayerEvent): void {
  event.target.playVideo();
}

let done = false;
function onPlayerStateChange(event: YT.OnStateChangeEvent): void {
  if (event.data == YT.PlayerState.PLAYING && !done) {
    setTimeout(stopVideo, 6000);
    done = true;
  }
}
function stopVideo(): void {
  player.stopVideo();
}

connect();

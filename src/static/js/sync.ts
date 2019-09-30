/** @preserve sync.js */
'use strict';

const youtubeLink = document.getElementById('youtubeLink') as HTMLInputElement;
const userList = document.getElementById('chatUsers') as HTMLDivElement;
const chat = document.getElementById('chat-box') as HTMLDivElement;
const messageBox = document.getElementById('messageBox') as HTMLInputElement;

const youTubeRegexp = new RegExp(
  '^(?:https?:\\/\\/)?(?:m\\.|www\\.)?(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=))' +
  '((\\w|-){11})(\\?\\S*)?$');

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
    }, 30000);
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
      ws.send(JSON.stringify({
        'event': 'userMessage',
        'message': messageBox.value.replace(/\s+/g, ' ').trim(),
      }));
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
  const data = JSON.parse(message);
  if (data['event'] != 'userList') {
    const msg = document.createElement('div');
    const username = document.createElement('span');
    setAttributes(msg, { 'class': 'message' });
    setAttributes(username, { 'class': `bold ${data['user'].color}` });
    switch (data['event']) {
      case 'userMessage':
        username.textContent = data['user'].name + ': ';
        msg.textContent = data['message'];
        break;
      case 'userConnect':
        username.textContent = data['user'].name;
        msg.textContent = ' s-a conectat!';
        msg.className += ' bold';

        userListAdd(data['user'].name, data['user'].color);
        userCountUpdate(++userCount);
        break;
      case 'userDisconnect':
        username.textContent = data['user'].name;
        msg.textContent = ' s-a deconectat!';
        msg.className += ' bold';
        userListRemove(data['user'].name);
        userCountUpdate(--userCount);
        break;
    }
    chat.appendChild(msg);
    msg.insertAdjacentElement('afterbegin', username);
    msg.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } else {
    for (let i = 0; i < data['usernames'].length; i++) {
      userListAdd(data['usernames'][i], data['usersColor'][i]);
    }
    userCount = data['usernames'].length;
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
  (document.getElementById('userCount') as HTMLSpanElement).textContent = count.toString();
}

let player: YT.Player;

youtubeLink.onkeyup = function(key): void {
  if (youTubeRegexp.test(youtubeLink.value)) {
    youtubeLink.classList.remove('lRed');
    youtubeLink.classList.add('lGreen');
  } else {
    if (youtubeLink.value.length > 0) {
      youtubeLink.classList.remove('lGreen');
      youtubeLink.classList.add('lRed');
    } else {
      youtubeLink.className = 'messageBox';
    }
  }
  if (key.keyCode === 13) {
    if (youtubeLink.classList.contains('lGreen')) {
      const videoID = youtubeLink.value.split(youTubeRegexp)[1];
      if (player) {
        player.cueVideoById({
          'videoId': videoID,
          'startSeconds': 0,
          'suggestedQuality': 'default',
        });
      } else {
        player = new YT.Player('player', {
          'videoId': videoID,
          'playerVars': {
            'start': 0,
            'enablejsapi': 1,
            'origin': 'https://gennerator.com',
          },
          'events': {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError,
          },
        });
      }
      youtubeLink.value = '';
      youtubeLink.classList.remove('lGreen');
    } else {
      snackbar('Link-ul introdus nu este valid!', 2);
    }
  }
};

function onPlayerReady(event: YT.PlayerEvent): void {
  console.log('YouTube Player Ready');
}

function onPlayerStateChange(event: YT.OnStateChangeEvent): void {
  console.log('Player status: ' + event.data);
}

function onPlayerError(event: YT.OnErrorEvent): void {
  console.log('Player error: ' + event.data);
}

connect();

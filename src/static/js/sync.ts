/** @preserve sync.js */
'use strict';

const syncCSS = document.createElement('link');
syncCSS.rel = 'stylesheet';
syncCSS.href = '/css/sync.css';
document.head.appendChild(syncCSS);

const videoPlayerDiv = document.getElementById('video-player') as HTMLDivElement;
const videoListDiv = document.getElementById('videoList') as HTMLDivElement;
const youtubeLinkInput = document.getElementById('youtubeLink') as HTMLInputElement;
const userListDiv = document.getElementById('chatUsers') as HTMLDivElement;
const chatDiv = document.getElementById('chat-box') as HTMLDivElement;
const messageBoxInput = document.getElementById('messageBox') as HTMLInputElement;

let initial = false;

const youTubeRegexp = new RegExp(
  '^(?:https?:\\/\\/)?(?:m\\.|www\\.)?(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=))' +
  '((\\w|-){11})([\\?\\&]\\S*)?$');

let userCount = 0;
let retryCounter = 0;
const maxRetries = 5;

let videoInit = false;

let ws: WebSocket;
let player: YT.Player;

/**
 * Connect to the WebSocket Server
 */
function connect(): void {
  ws = new WebSocket('wss://gennerator.com/ws');
  let interval: NodeJS.Timeout;

  ws.onopen = function(): void {
    if (initial) {
      snackbar('Conexiunea a fost restabilită!', 0);
    } else {
      initial = true;
    }

    // Clear the user list
    while (userListDiv.firstChild) {
      userListDiv.removeChild(userListDiv.firstChild);
    }

    // Clear the video list
    while (videoListDiv.firstChild) {
      videoListDiv.removeChild(videoListDiv.firstChild);
    }

    // Remove the player iframe if exists
    if (player) {
      player.destroy();
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
}

messageBoxInput.onkeydown = function(key): void {
  if (key.keyCode === 13) {
    key.preventDefault();
  }
};

messageBoxInput.onkeyup = function(key): void {
  if (key.keyCode === 13) {
    const msg = messageBoxInput.value.replace(/\s+/g, ' ').trim();
    if (msg.length > 0) {
      ws.send(JSON.stringify({
        'event': 'userMessage',
        'message': msg,
      }));
    }
    messageBoxInput.value = '';
  }
};

messageBoxInput.onfocus = function(): void {
  messageBoxInput.placeholder = '';
};

messageBoxInput.onblur = function(): void {
  messageBoxInput.placeholder = 'Mesajul tău...';
};

/**
 * Processes a WebSocket message
 * @param message The message
 */
function handleMessage(message: string): void {
  const data = JSON.parse(message);
  switch (data['event']) {
    case 'join':
      userCount = data['userList'].length;
      for (let i = 0; i < userCount; i++) {
        userListAdd(data['userList'][i], data['userColorList'][i]);
      }
      userCountUpdate(userCount);
      for (let i = 0; i < data['videoList'].length; i++) {
        videoListAdd(data['videoList'][i]);
      }
      if (data['currentVideo'] != '') {
        cueVideo(data['currentVideo']);
      }
      break;
    case 'userConnect':
      displayMessage(data['user'].name, data['user'].color, 'status', 's-a conectat!');
      userListAdd(data['user'].name, data['user'].color);
      userCountUpdate(++userCount);
      break;
    case 'userDisconnect':
      displayMessage(data['user'].name, data['user'].color, 'status', 's-a deconectat!');
      userListRemove(data['user'].name);
      userCountUpdate(--userCount);
      break;
    case 'userMessage':
      displayMessage(data['user'].name, data['user'].color, 'message', data['message']);
      break;
    case 'ytAddVideo':
      switch (data['status']) {
        case 'addVideo':
          videoListAdd(data['videoID']);
          if (document.getElementsByTagName('iframe').length == 0) {
            sendToQueue(data['videoID']);
          }
          break;
        case 'notAvailable':
          snackbar('Videoclipul introdus nu există!', 2);
          break;
        case 'videoExists':
          snackbar('Videoclipul introdus există deja în lista de redare!', 2);
          break;
        default: snackbar('Ceva nu a mers bine. Încearcă mai târziu!', 1);
      }
      break;
    case 'ytRemoveVideo':
      videoListRemove(data['videoID']);
      if (player.getVideoUrl().substr(-11) == data['videoID']) {
        player.destroy();
      }
      break;
    case 'ytCueVideo':
      cueVideo(data['videoID']);
      break;
    case 'ytStartVideo':
      player.playVideo();
      break;
    case 'ytPlayVideo':
      player.playVideo();
      break;
  }
}

/**
 * Updates the user count
 * @param count The number of users
 */
function userCountUpdate(count: number): void {
  (document.getElementById('userCount') as HTMLSpanElement).textContent = count.toString();
}


/**
 * Displays a message in the chat
 * @param username User that sent the message
 * @param usernameColor Username color
 * @param type Type of the message
 * @param message Message to display
 */
function displayMessage(username: string, usernameColor: string, type: 'message' | 'status', message: string): void {
  const usr = document.createElement('span');
  const msg = document.createElement('div');
  setAttributes(usr, { 'class': `bold ${usernameColor}` });
  setAttributes(msg, { 'class': 'message' });
  usr.textContent = username;
  msg.textContent = message;
  if (type == 'message') {
    usr.textContent += ': ';
  } else {
    usr.textContent += ' ';
    msg.className += ' bold';
  }
  chatDiv.appendChild(msg);
  msg.insertAdjacentElement('afterbegin', usr);
  chatDiv.scrollTop = msg.offsetTop;
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
  userListDiv.appendChild(user);
}

/**
 * Removes an user from the user list
 * @param username Username to remove
 */
function userListRemove(username: string): void {
  for (let i = 0; i < userListDiv.childNodes.length; i++) {
    if (userListDiv.childNodes[i].textContent == username) {
      userListDiv.removeChild(userListDiv.childNodes[i]);
    }
  }
}

/**
 * Adds a video to the playlist
 * @param videoID Video ID to add to the playlist
 */
function videoListAdd(videoID: string): void {
  const video = document.createElement('div');

  const videoInfo = document.createElement('div');

  const videoDelete = document.createElement('a');
  const videoName = document.createElement('div');

  const videoThumbnail = document.createElement('picture');
  const videoThumbnailSource = document.createElement('source');
  const videoThumbnailImg = document.createElement('img');

  setAttributes(video, {
    'class': 'videoListVideo',
    'id': videoID,
  });

  setAttributes(videoInfo, { 'class': 'videoInfo' });
  setAttributes(videoDelete, { 'class': 'videoDelete red' });
  setAttributes(videoName, { 'class': 'videoName' });

  setAttributes(videoThumbnail, { 'class': 'videoThumbnail' });
  setAttributes(videoThumbnailSource, {
    'type': 'image/webp',
    'srcset': `https://i.ytimg.com/vi_webp/${videoID}/default.webp`,
  });
  setAttributes(videoThumbnailImg, {
    'alt': 'Video thumbnail',
    'src': `https://i.ytimg.com/vi/${videoID}/default.jpg`,
    'height': '90',
    'width': '120',
  });
  videoDelete.textContent = 'X';

  fetchCORS(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoID}`)
    .then((res) => {
      videoName.textContent = res['title'] as string;
    })
    .catch(() => {
      videoName.textContent = '';
    });

  videoDelete.onclick = function(): void {
    ws.send(JSON.stringify({
      'event': 'ytRemoveVideo',
      'videoID': videoID,
    }));
  };
  videoThumbnail.onclick = function(): void {
    sendToQueue(videoID);
  };
  videoName.onclick = videoThumbnail.onclick;

  videoThumbnail.appendChild(videoThumbnailSource);
  videoThumbnail.appendChild(videoThumbnailImg);
  videoInfo.appendChild(videoDelete);
  videoInfo.appendChild(videoName);
  video.appendChild(videoThumbnail);
  video.appendChild(videoInfo);
  videoListDiv.appendChild(video);
  videoListDiv.scrollTop = video.offsetTop;
}

/**
 * Event handler when clicking on a video from the playlist
 * @param videoID Video ID to send to the queue
 */
function sendToQueue(videoID: string): void {
  ws.send(JSON.stringify({
    'event': 'ytCueVideo',
    'videoID': videoID,
  }));
}

/**
 * Removes a video from the playlist
 * @param videoID Video ID to remove from the playlist
 */
function videoListRemove(videoID: string): void {
  videoListDiv.removeChild(document.getElementById(videoID) as HTMLDivElement);
}

/**
 * Displays the video in the player iframe
 * @param videoID Video ID of the video
 */
function cueVideo(videoID: string): void {
  if (document.getElementsByTagName('iframe').length == 1) {
    player.cueVideoById({
      'videoId': videoID,
      'startSeconds': 0,
      'suggestedQuality': 'default',
    });
  } else {
    const playerFrame = document.createElement('iframe');
    setAttributes(playerFrame, {
      'frameborder': '0',
      'width': '100%',
      'height': '100%',
      'allowfullscreen': '',
      'id': 'player',
      'src': `https://www.youtube.com/embed/${videoID}?origin=https://gennerator.com&enablejsapi=1&start=0`,
    });
    playerFrame.onload = function(): void {
      player = new YT.Player('player', {
        'events': {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError,
        },
      });
    };
    videoPlayerDiv.appendChild(playerFrame);
  }
}

youtubeLinkInput.onkeyup = function(key): void {
  if (youTubeRegexp.test(youtubeLinkInput.value)) {
    youtubeLinkInput.classList.remove('lRed');
    youtubeLinkInput.classList.add('lGreen');
  } else {
    if (youtubeLinkInput.value.length > 0) {
      youtubeLinkInput.classList.remove('lGreen');
      youtubeLinkInput.classList.add('lRed');
    } else {
      youtubeLinkInput.className = 'messageBox';
    }
  }
  if (key.keyCode === 13) {
    if (youtubeLinkInput.classList.contains('lGreen')) {
      const videoID = youtubeLinkInput.value.split(youTubeRegexp)[1];
      ws.send(JSON.stringify({
        'event': 'ytAddVideo',
        'videoID': videoID,
      }));
      youtubeLinkInput.value = '';
      youtubeLinkInput.classList.remove('lGreen');
    } else {
      snackbar('Link-ul introdus nu este valid!', 2);
    }
  }
};

function onPlayerReady(): void {
  console.log('YouTube Player Ready');
}


function onPlayerStateChange(event: YT.OnStateChangeEvent): void {
  console.log('Player status: ' + event.data);
  if (!videoInit) {
    if (event.data == -1) {
      ws.send(JSON.stringify({
        'event': 'ytStartVideo',
      }));
    }
    if (event.data == 1) {
      player.pauseVideo();
      videoInit = true;
      ws.send(JSON.stringify({
        'event': 'ytStartVideoReady',
      }));
    }
  }
}

function onPlayerError(event: YT.OnErrorEvent): void {
  console.log('Player error: ' + event.data);
}

connect();

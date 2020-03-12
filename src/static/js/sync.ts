'use strict';

const WSS = `wss://master.gennerator.com/ws`;
const originURL = document.location.origin;

const videoPlayerDiv = document.getElementById('video-player') as HTMLDivElement;
const videoListDiv = document.getElementById('videoList') as HTMLDivElement;
const youtubeLinkInput = document.getElementById('youtubeLink') as HTMLInputElement;
const userListDiv = document.getElementById('chatUsers') as HTMLDivElement;
const userCountSpan = document.getElementById('userCount') as HTMLSpanElement;
const chatDiv = document.getElementById('chat-box') as HTMLDivElement;
const messageBoxInput = document.getElementById('messageBox') as HTMLInputElement;

class SyncRoom {

  private userList: [{ name: string; color: string }];
  private videoList: string[];
  private currentVideo: string;
  private master: boolean;

  constructor(userlist: [{ name: string; color: string }], videolist: string[], currentvideo: string) {
    if (player) {
      player.destroy();
    }
    /**
     * Initialize the user list
     */
    while (userListDiv.firstChild) {
      userListDiv.removeChild(userListDiv.firstChild);
    }
    this.userList = userlist;
    const userListLength = this.userList.length;
    userCountSpan.textContent = userListLength.toString();
    for (let i = 0; i < userListLength; i++) {
      userListAdd(this.userList[i]['name'], this.userList[i]['color']);
    }
    /**
     * Initialize the video list
     */
    while (videoListDiv.firstChild) {
      videoListDiv.removeChild(videoListDiv.firstChild);
    }
    this.videoList = videolist;
    for (let i = 0; i < this.videoList.length; i++) {
      videoListAdd(videolist[i]);
    }
    /**
     * Initialize the current video
     */
    this.currentVideo = currentvideo;
    if (this.currentVideo !== '') {
      cueVideo(this.currentVideo);
    }
    this.master = false;
  }

  /**
   * Adds a user to the user list
   * @param user The user
   */
  addUser(user: { name: string; color: string }): void {
    displayMessage(user['name'], user['color'], 'status', 's-a conectat!');
    this.userList.push(user);
    userCountSpan.textContent = this.userList.length.toString();
    userListAdd(user['name'], user['color']);
  }

  /**
   * Removes a user from the user list
   * @param username The username
   */
  removeUser(username: string): void {
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList[i]['name'] === username) {
        displayMessage(username, this.userList[i]['color'], 'status', 's-a deconectat!');
        this.userList.splice(i, 1);
        i = this.userList.length;
      }
    }
    userCountSpan.textContent = this.userList.length.toString();
    userListRemove(username);
  }

  /**
   * Returns the color of the specified username
   * @param username The username
   */
  getUserColorByName(username: string): string {
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList[i]['name'] === username) {
        return this.userList[i]['color'];
      }
    }
    return '';
  }

  /**
   * Adds a video to the video list
   * @param videoID The video ID of the video
   */
  addVideo(videoID: string): void {
    this.videoList.push(videoID);
    if (this.videoList.length === 1) {
      this.setCurrentVideo(videoID);
    }
    videoListAdd(videoID);
  }

  /**
   * Removes a video from the video list
   * @param videoID The video ID of the video
   */
  removeVideo(videoID: string): void {
    for (let i = 0; i < this.videoList.length; i++) {
      if (this.videoList[i] === videoID) {
        if (this.videoList[i] === this.currentVideo) {
          this.setCurrentVideo('');
        }
        this.videoList.splice(i, 1);
        videoListDiv.removeChild(document.getElementById(videoID) as HTMLDivElement);
        i = this.videoList.length;
      }
    }
  }

  /**
   * Sets the current video to play
   * @param videoID The video ID of the video
   */
  setCurrentVideo(videoID: string): void {
    this.currentVideo = videoID;
    if (this.currentVideo !== '') {
      cueVideo(this.currentVideo);
    } else {
      player.destroy();
    }
    videoInit = false;
  }

  /**
   * Sets the current user as the room master
   */
  setRoomMaster(): void {
    this.master = true;
  }

  /**
   * Returns whether the current user is the room master
   */
  get isMaster(): boolean {
    return this.master;
  }

  /**
   * Returns the connected user count
   */
  get userCount(): number {
    return this.userList.length;
  }
}

const youTubeRegexp = new RegExp(
  '^(?:https?:\\/\\/)?(?:m\\.|www\\.)?(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=))' +
  '((\\w|-){11})([\\?\\&]\\S*)?$');

let initial = false;

let retryCounter = 0;
const maxRetries = 5;

let videoInit = false;

let ws: WebSocket;
let room: SyncRoom;
let player: YT.Player;

/**
 * Connect to the WebSocket Server
 */
function connect(): void {
  ws = new WebSocket(WSS);
  let interval: NodeJS.Timeout;

  ws.onopen = function(): void {
    if (initial) {
      snackbar('Conexiunea a fost restabilită!', 0);
    } else {
      initial = true;
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
}

messageBoxInput.onkeydown = function(e): void {
  if (e.key === 'Enter') {
    e.preventDefault();
  }
};

messageBoxInput.onkeyup = function(e): void {
  if (e.key === 'Enter') {
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
      room = new SyncRoom(data['userList'], data['videoList'], data['currentVideo']);
      break;
    case 'roomMaster':
      room.setRoomMaster();
      break;
    case 'userConnect':
      room.addUser(data['user']);
      break;
    case 'userDisconnect':
      room.removeUser(data['username']);
      break;
    case 'userMessage':
      displayMessage(data['username'], room.getUserColorByName(data['username']), 'message', data['message']);
      break;
    case 'ytAddVideo':
      switch (data['status']) {
        case 'addVideo':
          room.addVideo(data['videoID']);
          break;
        case 'videoNotAvailable':
          snackbar('Videoclipul introdus nu există!', 2);
          break;
        case 'videoExists':
          snackbar('Videoclipul introdus există deja în lista de redare!', 2);
          break;
        default: snackbar('Ceva nu a mers bine. Încearcă mai târziu!', 1);
      }
      break;
    case 'ytRemoveVideo':
      room.removeVideo(data['videoID']);
      break;
    case 'ytCueVideo':
      room.setCurrentVideo(data['videoID']);
      break;
    case 'ytStartVideo':
      player.playVideo();
      break;
    case 'ytPlayVideo':
      player.playVideo();
      break;
    case 'ytPauseVideo':
      player.pauseVideo();
      break;
  }
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
    if (userListDiv.childNodes[i].textContent === username) {
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
    'srcset': `https://i.ytimg.com/vi_webp/${videoID}/mqdefault.webp`,
  });
  setAttributes(videoThumbnailImg, {
    'alt': 'Video thumbnail',
    'src': `https://i.ytimg.com/vi/${videoID}/mqdefault.jpg`,
    'height': '180',
    'width': '320',
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
 * Displays the video in the player iframe
 * @param videoID Video ID of the video
 */
function cueVideo(videoID: string): void {
  if (document.getElementsByTagName('iframe').length === 1) {
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
      'allow': 'accelerometer; autoplay; encrypted-media; gyroscope',
      'id': 'player',
      'src': `https://www.youtube.com/embed/${videoID}?origin=${originURL}&enablejsapi=1&start=0`,
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

youtubeLinkInput.onkeyup = function(e): void {
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
  if (e.key === 'Enter') {
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
  if (room.isMaster === true) {
    switch (event.data) {
      case YT.PlayerState.UNSTARTED:
        if (!videoInit) {
          ws.send(JSON.stringify({
            'event': 'ytStartVideo',
          }));
        }
        break;
      case YT.PlayerState.ENDED: break;
      case YT.PlayerState.PLAYING:
        if (!videoInit) {
          player.pauseVideo();
          videoInit = true;
          ws.send(JSON.stringify({
            'event': 'ytStartVideoReady',
          }));
        } else {
          ws.send(JSON.stringify({
            'event': 'ytStartVideo',
          }));
        }
        break;
      case YT.PlayerState.PAUSED:
        /*if (videoInit) {
          ws.send(JSON.stringify({
            'event': 'ytPauseVideo',
          }));
        }*/
        break;
      case YT.PlayerState.BUFFERING: break;
      case YT.PlayerState.CUED: break;
    }
  } else {
    switch (event.data) {
      case YT.PlayerState.UNSTARTED:
        break;
      case YT.PlayerState.ENDED: break;
      case YT.PlayerState.PLAYING:
        if (!videoInit) {
          player.pauseVideo();
          videoInit = true;
          ws.send(JSON.stringify({
            'event': 'ytStartVideoReady',
          }));
        }
        break;
      case YT.PlayerState.PAUSED:
        break;
      case YT.PlayerState.BUFFERING:
        break;
      case YT.PlayerState.CUED:
        break;
    }
  }
}

function onPlayerError(event: YT.OnErrorEvent): void {
  console.log('Player error: ' + event.data);
}

connect();

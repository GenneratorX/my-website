'use strict';

import https = require('https');

import WebSocket = require('ws');
import { Server as WSServer } from 'ws';

import { server } from '../app';
import * as env from '../env';

const wss = new WSServer({ path: '/ws', maxPayload: 200, noServer: true });

class WsRoom {
  /**
   * Available user colors
   */
  public static userColors = [
    'red', 'green', 'blue', 'orange', 'purple', 'yellow', 'brown', 'pink', 'teal'
  ];
  /**
   * List that contains the properties of all connected users
   */
  private userList: [{ ws: WebSocket; name: string; color: string }];
  /**
   * List that contains all videos added by the users
   */
  private videoList: string[];
  /**
   * Video ID of current playing video
   */
  private currentVideo: string;
  /**
   * WebSocket object of the user that is the room master
   */
  private roomMaster: WebSocket;
  /**
   * Anonymous username numbers from users that left the room
   */
  private usedNumbers: number[];
  /**
   * List that contains all the users that have currently buffered the current video
   */
  private readyCheckList: WebSocket[];

  constructor(ws: WebSocket, name?: string, color?: string) {
    this.videoList = [];
    this.currentVideo = '';
    this.usedNumbers = [];
    this.readyCheckList = [];

    let username: string;
    let usernameColor: string;
    if (name === undefined) {
      username = 'Anonim-1';
    } else {
      username = name;
    }
    if (color === undefined) {
      usernameColor = this.generateRandomColor();
    } else {
      usernameColor = color;
    }
    this.userList = [{ ws: ws, name: username, color: usernameColor }];

    this.sendMessage({
      event: 'join',
      userList: [{ name: this.userList[0].name, color: this.userList[0].color }],
      videoList: this.videoList,
      currentVideo: this.currentVideo,
    }, 'specificUser', ws);

    this.roomMaster = ws;
    this.sendMessage({
      event: 'roomMaster',
    }, 'specificUser', ws);
  }

  /**
   * Adds a user to the user list
   * @param ws WebSocket object of the client
   * @param name Username of the client
   * @param color Color of the username
   */
  addUser(ws: WebSocket, name?: string, color?: string): void {
    let username: string;
    let usernameColor: string;
    if (name === undefined) {
      username = this.generateRandomName();
    } else {
      username = name;
    }
    if (color === undefined) {
      usernameColor = this.generateRandomColor();
    } else {
      usernameColor = color;
    }

    this.userList.push({ ws: ws, name: username, color: usernameColor });
    const users = [{ name: username, color: usernameColor }];
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList[i].ws !== ws) {
        users.push({ name: this.userList[i].name, color: this.userList[i].color });
        this.userList[i].ws.send(JSON.stringify({
          event: 'userConnect',
          user: {
            name: username,
            color: usernameColor,
          },
        }));
      }
    }

    this.sendMessage({
      event: 'join',
      userList: users,
      videoList: this.videoList,
      currentVideo: this.currentVideo,
    }, 'specificUser', ws);
  }

  /**
   * Removes a user from the user list
   * @param ws WebSocket object of the client
   */
  removeUser(ws: WebSocket): void {
    for (let i = 0; i < this.userList.length; i++) {
      if (ws === this.userList[i].ws) {
        const username = this.getUserInfoByWS(ws).name;
        this.sendMessage({
          event: 'userDisconnect',
          username: username,
        }, 'allExceptSpecificUser', ws);

        this.usedNumbers.push(parseInt(username.split('-')[1], 10));

        this.userList.splice(i, 1);
        i = this.userList.length;

        if (this.userList.length > 0 && ws === this.roomMaster) {
          this.selectRandomRoomMaster();
        }
      }
    }
  }

  /**
   * Generate an anonymous name that is unique to the current room
   */
  generateRandomName(): string {
    if (this.usedNumbers.length !== 0) {
      this.usedNumbers = Array.from(new Uint32Array(this.usedNumbers).sort());
      return `Anonim-${this.usedNumbers.shift()}`;
    }
    return `Anonim-${this.userList.length + 1}`;
  }

  /**
   * Randomly select a color from all available colors
   */
  generateRandomColor(): string {
    return WsRoom.userColors[Math.floor(Math.random() * WsRoom.userColors.length)];
  }

  /**
   * Adds a video to the video list
   * @param videoID Video ID of the video
   */
  addVideo(videoID: string): void {
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoID)) {
      if (!this.videoList.includes(videoID)) {
        getYouTubeVideoStatus(videoID)
          .then(() => {
            this.videoList.push(videoID);
            if (this.videoList.length === 1) {
              this.currentVideo = videoID;
            }
            this.sendMessage({
              event: 'ytAddVideo',
              status: 'addVideo',
              videoID: videoID,
            }, 'all');
          })
          .catch((e: string) => {
            this.sendMessage({
              event: 'ytAddVideo',
              status: e,
            }, 'specificUser', this.roomMaster);
          });
      } else {
        this.sendMessage({
          event: 'ytAddVideo',
          status: 'videoExists',
        }, 'specificUser', this.roomMaster);
      }
    }
  }

  /**
   * Removes a video from the video list
   * @param videoID Video ID of the video
   */
  removeVideo(videoID: string): void {
    for (let i = 0; i < this.videoList.length; i++) {
      if (videoID === this.videoList[i]) {
        this.videoList.splice(i, 1);
        i = this.videoList.length;
        if (videoID === this.currentVideo) {
          this.currentVideo = '';
        }
        this.sendMessage({
          event: 'ytRemoveVideo',
          videoID: videoID,
        }, 'all');
      }
    }
  }

  /**
   * Sets the current video to play
   * @param videoID Video ID of the video
   */
  setCurrentVideo(videoID: string): void {
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoID) && this.videoList.includes(videoID)) {
      this.currentVideo = videoID;
      this.sendMessage({
        event: 'ytCueVideo',
        videoID: videoID,
      }, 'all');
    }
  }

  /**
   * Starts the playback of the current video
   */
  playCurrentVideo(): void {
    if (this.currentVideo !== '') {
      this.sendMessage({
        event: 'ytStartVideo',
      }, 'allExceptSpecificUser', this.roomMaster);
    }
  }

  /**
   * Pauses the playback of the current video
   */
  pauseCurrentVideo(): void {
    if (this.currentVideo !== '') {
      this.sendMessage({
        event: 'ytPauseVideo',
      }, 'allExceptSpecificUser', this.roomMaster);
    }
  }

  /**
   * Gets a user info based on a WebSocket object
   * @param ws WebSocket object of the user
   * @return Object containing user properties if the user exists, placeholder object otherwise
   */
  getUserInfoByWS(ws: WebSocket): { name: string; color: string } {
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList[i].ws === ws) {
        return { name: this.userList[i].name, color: this.userList[i].color };
      }
    }
    return { name: '', color: '' };
  }

  /**
   * Selects a random user to be the room master
   */
  selectRandomRoomMaster(): void {
    this.roomMaster = this.userList[Math.floor(Math.random() * this.userList.length)].ws;
    this.sendMessage({
      event: 'roomMaster',
    }, 'specificUser', this.roomMaster);
  }

  /**
   * Mark specific user as ready and start video playback when everyone is ready
   * @param ws WebSocket object of the user
   */
  readyCheck(ws: WebSocket): void {
    this.readyCheckList.push(ws);
    if (this.readyCheckList.length === this.userList.length) {
      this.sendMessage({
        event: 'ytPlayVideo',
      }, 'all');
      this.readyCheckList = [];
    }
  }

  /**
   * Sends a message to the connected users
   * @param to To whom to send the message
   * @param message Message to send
   * @param user User to (not)send the message to
   */
  sendMessage(
    message: { [prop: string]: any }, // eslint-disable-line @typescript-eslint/no-explicit-any
    to: 'all' | 'allExceptSpecificUser' | 'specificUser',
    user?: WebSocket
  ): void {
    switch (to) {
      case 'all':
        for (let i = 0; i < this.userlist.length; i++) {
          this.userlist[i].ws.send(JSON.stringify(message));
        }
        break;
      case 'allExceptSpecificUser':
        for (let i = 0; i < this.userlist.length; i++) {
          if (this.userlist[i].ws !== user) {
            this.userlist[i].ws.send(JSON.stringify(message));
          }
        }
        break;
      case 'specificUser':
        (user as WebSocket).send(JSON.stringify(message));
        break;
    }
  }

  get userlist(): [{ ws: WebSocket; name: string; color: string }] {
    return this.userList;
  }

  get videolist(): string[] {
    return this.videoList;
  }

  get currentvideo(): string {
    return this.currentVideo;
  }

  get master(): WebSocket {
    return this.roomMaster;
  }

  set master(ws: WebSocket) {
    this.roomMaster = ws;
  }
}

/**
 * Checks if a YouTube video is available
 * @param videoID Video ID of the video
 */
function getYouTubeVideoStatus(videoID: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'i.ytimg.com',
      port: 443,
      path: `/vi/${videoID}/default.jpg`,
      method: 'HEAD',
    }, (res) => {
      if (res.statusCode === 200) {
        resolve('videoAvailable');
      } else {
        reject('videoNotAvailable');
      }
    }).on('error', () => {
      reject('connectionError');
    }).end();
  });
}

let room: WsRoom;

interface MyWS extends WebSocket {
  /**
   * Living status of a WS client. Used for the heartbeat functionality
   */
  isAlive: boolean;
}

wss.on('connection', (ws: MyWS) => {

  ws.isAlive = true;
  if (wss.clients.size === 1) {
    room = new WsRoom(ws);
  } else {
    room.addUser(ws, room.generateRandomName(), room.generateRandomColor());
  }

  ws.on('message', (message) => {
    let data: { [prop: string]: string };
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      data = { validJSON: 'no' };
    }
    if (data.validJSON === undefined && data.event !== undefined) {
      switch (data.event) {
        case 'userMessage':
          if (data.message !== undefined) {
            room.sendMessage({
              event: 'userMessage',
              username: room.getUserInfoByWS(ws).name,
              message: data.message,
            }, 'all');
          }
          break;
        case 'ytAddVideo':
          if (data.videoID !== undefined) {
            room.addVideo(data.videoID);
          }
          break;
        case 'ytRemoveVideo':
          if (data.videoID !== undefined) {
            room.removeVideo(data.videoID);
          }
          break;
        case 'ytCueVideo':
          if (data.videoID !== undefined) {
            room.setCurrentVideo(data.videoID);
          }
          break;
        case 'ytStartVideo':
          room.playCurrentVideo();
          break;
        case 'ytStartVideoReady':
          room.readyCheck(ws);
          break;
        case 'ytPauseVideo':
          room.pauseCurrentVideo();
          break;
      }
    }
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    room.removeUser(ws);
  });

  ws.on('error', (err) => {
    console.log(err);
  });
});

server.on('upgrade', function(req, socket, head) {
  if (req.headers.origin !== undefined && req.headers.origin === env.ORIGIN) {
    wss.handleUpgrade(req, socket, head, function(ws) {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
    return;
  }
});

/**
 * HEARTBEAT
 */
setInterval(() => {
  for (const client of wss.clients as Set<MyWS>) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping(null);
  }
}, 30000);

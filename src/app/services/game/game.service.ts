import { Injectable } from "@angular/core";
import {Message} from "../../datatypes/Message";
import {SocketService} from "../socket/socket.service";
import * as Peer from "../../libs/simplepeer";
import {Player} from "../../datatypes/Player";
import {Camera} from "../../datatypes/Camera";

@Injectable({
  providedIn: "root"
})
export class GameService {
  connectState = 0;
  distanceExponent = 2.4;
  tolerance = 210;
  uuid: string;
  channel: string;
  cameraUUID: string;
  players = {};
  cameras = {};

  constructor(private socketService: SocketService) { }

  initiateSocketConnection(): void {
    this.socketService.init();

    if (localStorage.getItem("uuid") !== null) {
      console.log("UUID loaded from localStorage: " + localStorage.getItem("uuid"));
      this.socketService.send("UUID", localStorage.getItem("uuid"), "SERVER");
    }

    this.socketService.onMessage("INIT", (message: Message) => {
      if (localStorage.getItem("uuid") === null || localStorage.getItem("uuid") === message.data.uuid) {
        this.uuid = message.data.uuid;
        localStorage.setItem("uuid", this.uuid);
        console.log("UUID assigned: " + this.uuid);

        this.players[this.uuid] = new Player(this.uuid);

        this.socketService.send("JOIN", this.channel, "SERVER");
      }
    }).onMessage("JOINED", () => {
      this.connectState = 2;
      this.socketService.send("HELLO", {camera: false});
      console.log("Room joined: " + this.channel);
    }).onMessage("HELLO", (message: Message) => {
      if (message.data.camera) {
        this.cameras[message.from] = new Camera(message.from, message.data.playerUUID);
        console.log("New camera activated: " + message.from);

        this.socketService.send("REQUEST", null, message.from);

        if (message.data.playerUUID === this.uuid) {
          this.cameraUUID = message.from;
          console.log("Camera linked: " + message.from);
        }
      } else {
        this.players[message.from] = new Player(message.from);
        console.log("New player joined: " + message.from);
        this.socketService.send("WELCOME", {camera: false});
      }
    }).onMessage("WELCOME", (message: Message) => {
      if (message.data.camera) {
        this.cameras[message.from] = new Camera(message.from, message.data.playerUUID);
        console.log("New camera activated: " + message.from);

        if (message.data.playerUUID === this.uuid) {
          this.cameraUUID = message.from;
          console.log("Camera linked: " + message.from);
        }
      } else {

      }
    }).onMessage("OFFER", (message: Message) => {
      console.log("Received offer from " + message.from);
      if (this.cameras[message.from].peer === undefined) {
        this.initiatePeerConnection(message.from);
      }
      this.cameras[message.from].peer.signal(message.data);
    });
  }

  initiatePeerConnection(partnerUUID): void {
    const peerConnection = new Peer();
    peerConnection.on("signal", data => {
      this.socketService.send("ANSWER", data, partnerUUID);
    });
    peerConnection.on("connect", () => {
      console.log("Connected with " + partnerUUID);
    });
    peerConnection.on("stream", stream => {
      console.log("Stream incoming from " + partnerUUID);
      this.createStreamVideo(partnerUUID, stream);
    });
    peerConnection.on("error", (e) => {
      console.log("Error with " + partnerUUID + ": ", e);
      this.destroyPeerConnection(partnerUUID);
    });
    peerConnection.on("close", () => {
      console.log("Connection closed from " + partnerUUID);
      this.destroyPeerConnection(partnerUUID);
    });
    this.cameras[partnerUUID].peer = peerConnection;

    return peerConnection;
  }

  destroyPeerConnection(partnerUUID): void {
    if (partnerUUID in this.players) {
      delete this.players[partnerUUID];
    } else if (partnerUUID in this.cameras) {
      this.cameras[partnerUUID].video.remove();
      this.cameras[partnerUUID].canvas.remove();
      this.cameras[partnerUUID].peer.destroy();
      delete this.cameras[partnerUUID];
    }
  }

  createStreamVideo(client: string, stream): void {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();
    this.cameras[client].video = video;

    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    this.cameras[client].canvas = canvas;
    this.cameras[client].context = canvas.getContext("2d");
  }

  escapeImageData(imageData, filterColors): void {
    for (let i = 0; i < imageData.data.length; i += 4) {
      const diff: number[] = [];

      for (const filterColor of filterColors) {
        diff.push(Math.sqrt(
          Math.pow(imageData.data[i] - filterColor[0], 2) +
          Math.pow(imageData.data[i + 1] - filterColor[1], 2) +
          Math.pow(imageData.data[i + 2] - filterColor[2], 2)
        ));
      }

      imageData.data[i + 3] = Math.min(255, Math.pow(Math.min(...diff), this.distanceExponent) / this.tolerance);
    }
  }
}

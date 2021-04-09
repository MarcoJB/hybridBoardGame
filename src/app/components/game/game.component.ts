import { Component, OnInit } from "@angular/core";
import {AR} from "../../libs/aruco";
import {Message} from "../../datatypes/Message";
import * as Peer from "../../libs/simplepeer";
import {SocketService} from "../../services/socket/socket.service";
import {PeerConnection} from "../../datatypes/PeerConnection";

@Component({
  selector: "app-game",
  templateUrl: "./game.component.html",
  styleUrls: ["./game.component.css"]
})
export class GameComponent implements OnInit {
  connectState = 0;
  distanceExponent = 2.4;
  tolerance = 210;
  selectedMediaDeviceId: string;
  detector: AR.Detector;
  selectedColors = [[230, 230, 230], [200, 200, 200], [175, 175, 175]];
  dimensions = {
    aruco: 37,
    central: 170,
    distance: 4
  };
  uuid: string;
  peers = {};
  streamVideos = {};
  streamContexts = {};
  streamCanvas = {};
  debug = false;
  streamActive = {};
  dieValue = 1;
  dieThrows = 0;
  transitionRunning = false;

  constructor(private socketService: SocketService) { }

  public ngOnInit(): void { }

  init(): void {
    this.connectState = 1;
    this.initiateSocketConnection();
    requestAnimationFrame(() => this.tick());
  }

  roll(): void {
    if (!this.transitionRunning) {
      this.transitionRunning = true;
      this.dieThrows++;
      this.dieValue = Math.floor(Math.random() * 6) + 1;
      this.socketService.send("DICE", this.dieValue);
    }
  }

  transitionEnd(): void {
    this.transitionRunning = false;
  }

  initiateSocketConnection(): void {
    this.socketService.init();

    this.socketService.onMessage("INIT", (message: Message) => {
      this.connectState = 2;
      this.uuid = message.data.uuid;
      this.socketService.send("HELLO", 0);
      console.log("Connected to Socket Server. UUID: " + this.uuid);
    }).onMessage("HELLO", (message: Message) => {
      if (message.data === 1) {
        this.socketService.send("REQUEST", null, message.from);
        console.log("New Camera activated.");
      } else {
        console.log("New Player joined.");
      }
    }).onMessage("OFFER", (message: Message) => {
      console.log("Received Offer from " + message.from);
      if (!this.peers.hasOwnProperty(message.from)) {
        this.initiatePeerConnection(message.from);
      }
      this.peers[message.from].signal(message.data);
    }).onMessage("DICE", (message: Message) => {
      this.transitionRunning = true;
      this.dieThrows++;
      this.dieValue = message.data;
    });
  }

  initiatePeerConnection(partnerUUID): void {
    /*const peerConnection = new PeerConnection(this.socketService, this.uuid, partnerUUID);
    peerConnection.on("stream", stream => {
      this.createStreamVideo(partnerUUID, stream);
    });
    peerConnection.on("destroy", () => {

    })
    this.peers[partnerUUID] = peerConnection;*/

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
    this.peers[partnerUUID] = peerConnection;

    return peerConnection;
  }

  destroyPeerConnection(partnerUUID): void {
    if (partnerUUID in this.peers) {
      this.streamVideos[partnerUUID].remove();
      this.streamCanvas[partnerUUID].remove();
      this.peers[partnerUUID].destroy();
      delete this.peers[partnerUUID];
      delete this.streamVideos[partnerUUID];
      delete this.streamContexts[partnerUUID];
      delete this.streamCanvas[partnerUUID];
    }
  }

  createStreamVideo(client: string, stream): void {
    this.streamActive[client] = false;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();
    this.streamVideos[client] = video;
    if (this.debug) {
      document.getElementById("streams").parentNode.appendChild(video);
    }

    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    this.streamCanvas[client] = canvas;
    this.streamContexts[client] = canvas.getContext("2d");
  }

  tick(): void {
    requestAnimationFrame(() => this.tick());
    this.updateRemoteVideos();
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

  updateRemoteVideos(): void {
    for (const uuid of Object.keys(this.streamVideos)) {
      this.streamContexts[uuid].drawImage(this.streamVideos[uuid], 0, 0, 480, 480);

      if (!this.streamActive[uuid]) {
        const imgData = this.streamContexts[uuid].getImageData(0, 0, 1, 1).data;
        if (Math.max(imgData[0], imgData[1], imgData[2]) > 0) {
          this.streamActive[uuid] = true;
          document.getElementById("streams").appendChild(this.streamCanvas[uuid]);
        }
      }

      if (this.streamContexts[uuid] && this.selectedColors) {
        const frame = this.streamContexts[uuid].getImageData(0, 0, 480, 480);
        this.escapeImageData(frame, this.selectedColors);
        this.streamContexts[uuid].putImageData(frame, 0, 0);
      }
    }
  }
}

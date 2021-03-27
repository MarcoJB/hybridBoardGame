import { Component, OnInit } from "@angular/core";
import {AR} from "../../libs/aruco";
import {Message} from "../../datatypes/Message";
import * as Peer from "../../libs/simplepeer";

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
  peerSelectedColors = {};
  socket;

  public ngOnInit(): void {
  }

  init(): void {
    this.connectState = 1;
    this.connectSocketServer();
    requestAnimationFrame(() => this.tick());
  }

  connectSocketServer(): void {
    if (location.hostname === "localhost") {
      this.socket = new WebSocket("ws://localhost:3000");
    } else {
      this.socket = new WebSocket("wss://beingbush.lynk.sh");
    }

    this.socket.addEventListener("message", messageRaw => {
      const message = JSON.parse(messageRaw.data);

      switch (message.type) {
        case "INIT":
          this.connectState = 2;
          this.uuid = message.data.uuid;
          this.socket.send(JSON.stringify(new Message("HELLO", 0)));
          console.log("Connected to Socket Server.");
          break;
        case "HELLO":
          if (message.data === 1) {
            this.socket.send(JSON.stringify(new Message("REQUEST")));
            console.log("New Camera activated.");
          } else {
            console.log("New Player joined.");
          }
          break;
        case "OFFER":
          console.log("Received Offer from " + message.from);
          if (!this.peers.hasOwnProperty(message.from)) {
            this.initiatePeerConnection(message.from);
          }
          this.peers[message.from].signal(message.data);
          break;
        default:
          console.log(message);
      }
    });
  }

  initiatePeerConnection(partnerUUID): Peer {
    /*const peerConnection = new PeerConnection(this.socket, this.uuid, client, this.unescapedVideo.captureStream(10), true);
      peerConnection.on("stream", stream => {
        this.createStreamVideo(client, stream);
      });
      this.peerConnections.push(peerConnection);*/

    const peerConnection = new Peer();
    peerConnection.on("signal", data => {
      this.socket.send(JSON.stringify(new Message("ANSWER", data, partnerUUID)));
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
    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();
    this.streamVideos[client] = video;

    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    document.getElementById("streams").appendChild(canvas);
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

      if (this.selectedColors) {
        const frame = this.streamContexts[uuid].getImageData(0, 0, 480, 480);
        this.escapeImageData(frame, this.selectedColors);
        this.streamContexts[uuid].putImageData(frame, 0, 0);
      }
    }
  }
}

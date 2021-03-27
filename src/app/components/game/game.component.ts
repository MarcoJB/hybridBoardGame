import { Component, OnInit } from "@angular/core";
import {AR} from "../../libs/aruco";
import {Vector} from "../../datatypes/Vector";
import {fx} from "../../libs/glfx";
import {Message} from "../../datatypes/Message";
import * as Peer from "../../libs/simplepeer";

@Component({
  selector: "app-game",
  templateUrl: "./game.component.html",
  styleUrls: ["./game.component.css"]
})
export class GameComponent implements OnInit {
  distanceExponent = 2.4;
  tolerance = 210;
  mediaDevices: MediaDeviceInfo[] = [];
  selectedMediaDeviceId: string;
  detector: AR.Detector;
  webcamVideo;
  streamSettings;
  analysedVideo;
  escapedVideo;
  unescapedVideo;
  analysedVideoContext;
  escapedVideoContext;
  unescapedVideoContext;
  canvasFx;
  textureFx;
  selectedColors = [];
  dimensions = {
    aruco: 37,
    central: 170,
    distance: 4
  };
  uuid: string;
  peers = {};
  streamVideos = {};
  streamContexts = {};
  peerSelectedColors = {};
  socket;
  mobile: boolean;

  public ngOnInit(): void {
    this.mobile = navigator.userAgent.toLowerCase().indexOf("linux") >= 0;
    this.connectSocketServer();
    if (this.mobile) {
      this.webcamVideo = document.getElementById("webcam_video");
      this.analysedVideo = document.getElementById("analysed_video");
      this.analysedVideoContext = this.analysedVideo.getContext("2d");
      this.escapedVideo = document.getElementById("escaped_video");
      this.escapedVideoContext = this.escapedVideo.getContext("2d");
      this.unescapedVideo = document.getElementById("unescaped_video");
      this.unescapedVideoContext = this.unescapedVideo.getContext("2d");


      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: true}).then(() => {
          navigator.mediaDevices.enumerateDevices().then(devices => {
            this.mediaDevices = devices.filter(device => device.kind === "videoinput");
          });
        });
      }

      this.detector = new AR.Detector();

      this.canvasFx = fx.canvas();
      this.textureFx = this.canvasFx.texture(this.analysedVideo);
      document.getElementById("videos").insertBefore(this.canvasFx, document.getElementById("unescaped_video"));
    }
    requestAnimationFrame(() => this.tick());
  }

  connectSocketServer(): void {
    // this.socket = new WebSocket("ws://localhost:3000");
    this.socket = new WebSocket("wss://beingbush.lynk.sh");

    this.socket.addEventListener("message", messageRaw => {
      const message = JSON.parse(messageRaw.data);

      switch (message.type) {
        case "INIT":
          this.uuid = message.data.uuid;
          this.socket.send(JSON.stringify(new Message("HELLO", 0)));
          console.log("Connected to Socket Server.");

          /*this.uuid = message.data.uuid;

          for (const client of message.data.clients) {
            console.log("initiator");
            this.peers[client] = new Peer({initiator: true, streams: [this.unescapedVideo.captureStream()]});
            this.peers[client].on("signal", data => {
              this.socket.send(JSON.stringify(new Message("OFFER", data, this.uuid, client)));
            });
            this.peers[client].on("connect", () => {
              console.log("Connected with " + client);
            });
            this.peers[client].on("stream", stream => {
              console.log("Stream incoming from " + client);
              this.createStreamVideo(client, stream);
            });
          }*/

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
          console.log("OFFER");
          if (!this.peers.hasOwnProperty(message.from)) {
            console.log("not initiator");
            this.peers[message.from] = new Peer();
            this.peers[message.from].on("signal", data => {
              this.socket.send(JSON.stringify(new Message("ANSWER", data, this.uuid, message.from)));
            });
            this.peers[message.from].on("connect", () => {
              console.log("Connected with " + message.from);
            });
            this.peers[message.from].on("stream", stream => {
              console.log("Stream incoming from " + message.from);
              this.createStreamVideo(message.from, stream);
            });
          }

          this.peers[message.from].signal(message.data);

          break;
        case "ANSWER":
          console.log("ANSWER");
          this.peers[message.from].signal(message.data);
          break;
        case "COLORS":
          console.log(message.data);
          this.peerSelectedColors[message.from] = message.data;
          break;
      }
    });
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
    this.streamContexts[client] = canvas.getContext("2d");
  }

  cameraSelected(): void {
    // this.nextWebcam.next(this.selectedMediaDeviceId);
    navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: this.selectedMediaDeviceId
      }
    }).then(stream => {
      if ("srcObject" in this.webcamVideo) {
        this.webcamVideo.srcObject = stream;
      } else {
        this.webcamVideo.src = window.URL.createObjectURL(stream);
      }

      this.webcamVideo.play();

      this.streamSettings = stream.getVideoTracks()[0].getSettings();

      this.analysedVideo.width = this.streamSettings.width;
      this.analysedVideo.height = this.streamSettings.height;
    });
  }

  tick(): void {
    requestAnimationFrame(() => this.tick());

    if (this.mobile) {
      if (this.webcamVideo.readyState === this.webcamVideo.HAVE_ENOUGH_DATA) {
        this.snapshot();

        const markers = this.detectMarkers();
        this.calculateCenters(markers);
        this.highlightMarkers(markers);
        if (Object.keys(markers).length === 4) {
          this.transformPerspectively(markers);
          this.escape();
        }
      }
    }
    this.updateRemoteVideos();
  }

  snapshot(): void {
    this.analysedVideoContext.drawImage(this.webcamVideo, 0, 0, this.streamSettings.width, this.streamSettings.height);
  }

  detectMarkers(): object {
    const markers = {};
    const markersArray = this.detector.detect(this.analysedVideoContext.getImageData(0, 0,
      this.streamSettings.width, this.streamSettings.height));

    for (const marker of markersArray) {
      if (marker.id <= 3) {
        markers[marker.id] = marker;
      }
    }

    return markers;
  }

  calculateCenters(markers: object): void {
    for (const marker of Object.values(markers)) {
      marker.center = Vector.avg(marker.corners);
    }
  }

  highlightMarkers(markers: object): void {
    for (const marker of Object.values(markers)){
      this.analysedVideoContext.strokeStyle = "red";
      this.analysedVideoContext.lineWidth = 3;
      this.analysedVideoContext.beginPath();

      for (let i = 0; i < 4; i++) {
        this.analysedVideoContext.moveTo(marker.corners[i].x, marker.corners[i].y);
        this.analysedVideoContext.lineTo(marker.corners[(i + 1) % 4].x, marker.corners[(i + 1) % 4].y);
      }

      this.analysedVideoContext.stroke();
      this.analysedVideoContext.closePath();

      this.analysedVideoContext.fillStyle = "red";
      this.analysedVideoContext.font = "20px Arial";
      this.analysedVideoContext.fillText(marker.id, marker.center.x - 5, marker.center.y + 7);
    }
  }

  transformPerspectively(markers: object): void {
    const white = this.determineWhiteValue(markers);

    const pxPerCm = 480 / this.dimensions.central;
    const position = {
      x1: -(this.dimensions.aruco / 2 + this.dimensions.distance) * pxPerCm,
      x2: (this.dimensions.central  + this.dimensions.aruco / 2 + this.dimensions.distance) * pxPerCm,
      y1: (this.dimensions.aruco / 2) * pxPerCm,
      y2: (this.dimensions.central - this.dimensions.aruco / 2) * pxPerCm
    };
    const markerPositionsOnCanvas = [[
      position.x1, position.y2,
      position.x1, position.y1,
      position.x2, position.y1,
      position.x2, position.y2
    ], [
      position.y2, position.x2,
      position.y1, position.x2,
      position.y1, position.x1,
      position.y2, position.x1
    ], [
      position.x2, position.y1,
      position.x2, position.y2,
      position.x1, position.y2,
      position.x1, position.y1
    ], [
      position.y1, position.x1,
      position.y2, position.x1,
      position.y2, position.x2,
      position.y1, position.x2
    ]];

    this.textureFx.loadContentsOf(this.analysedVideo);
    this.canvasFx.draw(this.textureFx).perspective([
      markers[0].center.x, markers[0].center.y,
      markers[1].center.x, markers[1].center.y,
      markers[2].center.x, markers[2].center.y,
      markers[3].center.x, markers[3].center.y
    ], markerPositionsOnCanvas[0]).curves(
      [[0, 0], [white[0] / 255, 1]], [[0, 0], [white[1] / 255, 1]], [[0, 0], [white[2] / 255, 1]]).update();
  }

  determineWhiteValue(markers: object): number[] {
    return this.analysedVideoContext.getImageData(
      (markers[0].center.x + markers[1].center.x) / 2,
      (markers[0].center.y + markers[1].center.y) / 2, 1, 1
    ).data;
  }

  escape(): void {
    this.escapedVideoContext.drawImage(this.canvasFx, 0, 0);
    this.unescapedVideoContext.drawImage(this.escapedVideo, 0, 0);

    if (this.selectedColors) {
      const frame = this.escapedVideoContext.getImageData(0, 0, 480, 480);
      this.escapeImageData(frame, this.selectedColors);
      this.escapedVideoContext.putImageData(frame, 0, 0);
    }
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

      if (this.peerSelectedColors[uuid]) {
        const frame = this.streamContexts[uuid].getImageData(0, 0, 480, 480);
        this.escapeImageData(frame, this.peerSelectedColors[uuid]);
        this.streamContexts[uuid].putImageData(frame, 0, 0);
      }
    }
  }

  selectColor(e): void {
    this.selectedColors.push(Array.from(this.unescapedVideoContext.getImageData(
      e.layerX, e.layerY, 1, 1).data));
    this.socket.send(JSON.stringify(new Message("COLORS", this.selectedColors, this.uuid)));
  }

  resetColors(): void {
    this.selectedColors = [];
    this.socket.send(JSON.stringify(new Message("COLORS", this.selectedColors, this.uuid)));
  }
}

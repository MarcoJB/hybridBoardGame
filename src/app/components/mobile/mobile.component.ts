import { Component, OnInit } from "@angular/core";
import {AR} from "../../libs/aruco";
import {Vector} from "../../datatypes/Vector";
import {fx} from "../../libs/glfx";
import {Message} from "../../datatypes/Message";
import * as Peer from "../../libs/simplepeer";
import {SocketService} from "../../services/socket/socket.service";

@Component({
  selector: "app-mobile",
  templateUrl: "./mobile.component.html",
  styleUrls: ["./mobile.component.css"]
})
export class MobileComponent implements OnInit {
  mediaDevices: MediaDeviceInfo[] = [];
  selectedMediaDeviceId: string;
  detector: AR.Detector;
  webcamVideo;
  streamSettings;
  analysedVideo;
  unescapedVideo;
  analysedVideoContext;
  unescapedVideoContext;
  canvasFx;
  textureFx;
  dimensions = {
    aruco: 37,
    central: 170,
    distance: 4
  };
  uuid: string;
  peers = {};
  debug = false;
  stashedMarkers: object;

  constructor(private socketService: SocketService) { }

  public ngOnInit(): void {
    this.webcamVideo = document.createElement("video");
    this.webcamVideo.setAttribute("playsinline", true);
    this.analysedVideo = document.getElementById("analysed_video");
    this.analysedVideoContext = this.analysedVideo.getContext("2d");
    this.canvasFx = fx.canvas();
    this.textureFx = this.canvasFx.texture(this.analysedVideo);
    this.unescapedVideo = document.createElement("canvas");
    this.unescapedVideo.width = 480;
    this.unescapedVideo.height = 480;
    this.unescapedVideoContext = this.unescapedVideo.getContext("2d");

    if (this.debug) {
      document.getElementById("preview").parentNode.parentNode.appendChild(this.webcamVideo);
      document.getElementById("preview").parentNode.parentNode.appendChild(this.canvasFx);
      document.getElementById("preview").parentNode.parentNode.appendChild(this.unescapedVideo);
    }

    this.initiateSocketConnection();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({video: true}).then(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          this.mediaDevices = devices.filter(device => device.kind === "videoinput");
        });
      });
    }

    this.detector = new AR.Detector();

    requestAnimationFrame(() => this.tick());
  }

  initiateSocketConnection(): void {
    this.socketService.init();

    this.socketService.onMessage("INIT", (message: Message) => {
      this.uuid = message.data.uuid;
      this.socketService.send("HELLO", 1);
      console.log("Connected to Socket Server. UUID: " + this.uuid);
    }).onMessage("HELLO", (message: Message) => {
      if (message.data === 1) {
        console.log("New Camera activated.");
      } else {
        this.initiatePeerConnection(message.from);
        console.log("New Player joined.");
      }
    }).onMessage("REQUEST", (message: Message) => {
      console.log("Offer request received from " + message.from);
      this.initiatePeerConnection(message.from);
    }).onMessage("ANSWER", (message: Message) => {
      console.log("Received answer from " + message.from);
      this.peers[message.from].signal(message.data);
    });
  }

  initiatePeerConnection(partnerUUID): Peer {
    const peerConnection = new Peer({initiator: true, streams: [this.unescapedVideo.captureStream(10)]});
    peerConnection.on("signal", data => {
      this.socketService.send("OFFER", data, partnerUUID);
    });
    peerConnection.on("connect", () => {
      console.log("Connected with " + partnerUUID);
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
      this.peers[partnerUUID].destroy();
      delete this.peers[partnerUUID];
    }
  }

  cameraSelected(): void {
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

    if (this.webcamVideo.readyState === this.webcamVideo.HAVE_ENOUGH_DATA) {
      this.snapshot();

      const markers = this.detectMarkers();
      this.calculateCenters(markers);
      this.highlightMarkers(markers);
      if (Object.keys(markers).length === 4) {
        this.stashMarkers(markers);
      } else if (Object.keys(markers).length > 0) {
        this.tryToUseStashedMarkers(markers);
      }
      if (Object.keys(markers).length === 4) {
        this.transformPerspectively(markers);
        this.unescapedVideoContext.drawImage(this.canvasFx, 0, 0);
      }
    }
  }

  stashMarkers(markers: object): void {
    this.stashedMarkers = JSON.parse(JSON.stringify((markers)));
  }

  tryToUseStashedMarkers(markers: object): void {
    if (!this.stashedMarkers) {
      return;
    }

    let similar = true;

    for (const marker of Object.keys(markers)) {
      console.log(Math.sqrt(Math.pow(this.stashedMarkers[marker].center.x - markers[marker].center.x, 2) +
        Math.pow(this.stashedMarkers[marker].center.y - markers[marker].center.y, 2)));
      if (Math.sqrt(Math.pow(this.stashedMarkers[marker].center.x - markers[marker].center.x, 2) +
        Math.pow(this.stashedMarkers[marker].center.y - markers[marker].center.y, 2)) >= 5) {
        similar = false;
      }
    }

    if (similar) {
      for (const marker of Object.keys(this.stashedMarkers)) {
        if (!markers.hasOwnProperty(marker)) {
          markers[marker] = JSON.parse(JSON.stringify(this.stashedMarkers[marker]));
        }
      }
    }
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
      this.analysedVideoContext.moveTo(marker.corners[0].x, marker.corners[0].y);
      for (let i = 1; i < 4; i++) {
        this.analysedVideoContext.lineTo(marker.corners[i].x, marker.corners[i].y);
      }
      this.analysedVideoContext.closePath();
      this.analysedVideoContext.stroke();

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
    ], markerPositionsOnCanvas[3]).curves(
      [[0, 0], [white[0] / 255, 1]], [[0, 0], [white[1] / 255, 1]], [[0, 0], [white[2] / 255, 1]]).update();
  }

  determineWhiteValue(markers: object): number[] {
    return this.analysedVideoContext.getImageData(
      (markers[0].center.x + markers[1].center.x) / 2,
      (markers[0].center.y + markers[1].center.y) / 2, 1, 1
    ).data;
  }
}

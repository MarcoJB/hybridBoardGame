import { Component, OnInit } from "@angular/core";
import {Message} from "../../datatypes/Message";
import {SocketService} from "../../services/socket/socket.service";
import {ActivatedRoute} from "@angular/router";
import {GameService} from "../../services/game/game.service";
import {MatDialog} from "@angular/material/dialog";
import {CameraConfigComponent} from "../camera-config/camera-config.component";

@Component({
  selector: "app-game",
  templateUrl: "./game.component.html",
  styleUrls: ["./game.component.css"]
})
export class GameComponent implements OnInit {
  dieValue = 1;
  dieThrows = 0;
  transitionRunning = false;
  url: string;

  constructor(private socketService: SocketService,
              private route: ActivatedRoute,
              public gameService: GameService,
              private dialog: MatDialog) {
    this.url = location.href;
  }

  public ngOnInit(): void {
    this.gameService.channel = this.route.snapshot.paramMap.get("channel");
  }

  init(): void {
    this.gameService.connectState = 1;
    this.gameService.initiateSocketConnection();

    this.socketService.onMessage("DICE", (message: Message) => {
      this.transitionRunning = true;
      this.dieThrows++;
      this.dieValue = message.data;
    });

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

  tick(): void {
    requestAnimationFrame(() => this.tick());
    this.updateRemoteVideos();
  }

  updateRemoteVideos(): void {
    for (const uuid of Object.keys(this.gameService.cameras)) {
      if (this.gameService.cameras[uuid].context === undefined) {
        continue;
      }

      this.gameService.cameras[uuid].context.drawImage(this.gameService.cameras[uuid].video, 0, 0, 480, 480);

      if (!this.gameService.cameras[uuid].streamActive) {
        const imgData = this.gameService.cameras[uuid].context.getImageData(0, 0, 1, 1).data;
        if (Math.max(imgData[0], imgData[1], imgData[2]) > 0) {
          this.gameService.cameras[uuid].streamActive = true;
          document.getElementById("streams").appendChild(this.gameService.cameras[uuid].canvas);
        }
      }

      if (this.gameService.cameras[uuid].context && this.gameService.cameras[uuid].selectedColors) {
        const frame = this.gameService.cameras[uuid].context.getImageData(0, 0, 480, 480);
        this.gameService.escapeImageData(frame, this.gameService.cameras[uuid].selectedColors);
        this.gameService.cameras[uuid].context.putImageData(frame, 0, 0);
      }
    }
  }

  copyUrlToClipboard(): void {
    navigator.clipboard.writeText(this.url).then();
  }

  openCameraConfig(): void {
    const dialogRef = this.dialog.open(CameraConfigComponent, {
      width: "90vw",
      height: "90vh",
      maxWidth: "none"
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
    });
  }
}

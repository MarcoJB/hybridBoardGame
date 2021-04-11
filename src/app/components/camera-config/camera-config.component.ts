import { Component, OnInit } from "@angular/core";
import {GameService} from "../../services/game/game.service";

@Component({
  selector: "app-camera-config",
  templateUrl: "./camera-config.component.html",
  styleUrls: ["./camera-config.component.css"]
})
export class CameraConfigComponent implements OnInit {
  context;

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
    // @ts-ignore
    this.context = document.getElementById("preview").getContext("2d");

    requestAnimationFrame(() => {this.tick()});
  }

  tick(): void {
    requestAnimationFrame(() => {this.tick()});

    if (this.gameService.getCameraByPlayerUUID(this.gameService.uuid).streamActive) {
      this.context.drawImage(this.gameService.getCameraByPlayerUUID(this.gameService.uuid).video, 0, 0, 480, 480);
    }
  }

}

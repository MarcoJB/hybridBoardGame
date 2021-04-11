import { Component, OnInit } from "@angular/core";
import {GameService} from "../../services/game/game.service";

@Component({
  selector: "app-camera-config",
  templateUrl: "./camera-config.component.html",
  styleUrls: ["./camera-config.component.css"]
})
export class CameraConfigComponent implements OnInit {
  context;
  preview = true;

  constructor(public gameService: GameService) { }

  ngOnInit(): void {
    // @ts-ignore
    this.context = document.getElementById("preview").getContext("2d");

    requestAnimationFrame(() => { this.tick(); });
  }

  tick(): void {
    requestAnimationFrame(() => { this.tick(); });

    if (this.gameService.cameras[this.gameService.cameraUUID].streamActive) {
      this.context.drawImage(this.gameService.cameras[this.gameService.cameraUUID].video, 0, 0, 480, 480);

      if (this.preview && this.gameService.cameras[this.gameService.cameraUUID].selectedColors) {
        const frame = this.context.getImageData(0, 0, 480, 480);
        this.gameService.escapeImageData(frame, this.gameService.cameras[this.gameService.cameraUUID].selectedColors);
        this.context.putImageData(frame, 0, 0);
      }
    }
  }

  removeColor(colorIndex: any): void {
    this.gameService.cameras[this.gameService.cameraUUID].selectedColors.splice(colorIndex, 1);
  }

  addColor(e: MouseEvent): void {
    const factor = 480 / document.getElementById("preview").offsetHeight;
    const color = this.context.getImageData(e.offsetX * factor, e.offsetY * factor, 1, 1).data;
    this.gameService.cameras[this.gameService.cameraUUID].selectedColors.push([color[0], color[1], color[2]]);
  }

}

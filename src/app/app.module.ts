import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { AppComponent } from "./app.component";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import {MatSliderModule} from "@angular/material/slider";
import {FormsModule} from "@angular/forms";
import {MatOptionModule} from "@angular/material/core";
import {WebcamModule} from "ngx-webcam";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import { MobileComponent } from "./components/mobile/mobile.component";
import { GameComponent } from "./components/game/game.component";
import { AppRoutingModule } from "./app-routing.module";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import { HomeComponent } from "./components/home/home.component";
import {QRCodeModule} from "angularx-qrcode";
import { CameraConfigComponent } from "./components/camera-config/camera-config.component";
import {MatDialogModule} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";

@NgModule({
  declarations: [
    AppComponent,
    MobileComponent,
    GameComponent,
    HomeComponent,
    CameraConfigComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatSliderModule,
    FormsModule,
    MatOptionModule,
    WebcamModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    AppRoutingModule,
    MatProgressBarModule,
    QRCodeModule,
    MatDialogModule,
    MatIconModule
  ],
  providers: [

  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

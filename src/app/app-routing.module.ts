import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import {MobileComponent} from "./components/mobile/mobile.component";
import {GameComponent} from "./components/game/game.component";
import {HomeComponent} from "./components/home/home.component";

const routes: Routes = [
  { path: "mobile", component: MobileComponent },
  { path: ":channel", component: GameComponent },
  { path: "",   component: HomeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

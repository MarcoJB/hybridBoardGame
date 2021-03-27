import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import {MobileComponent} from "./components/mobile/mobile.component";
import {GameComponent} from "./components/game/game.component";

const routes: Routes = [
  { path: "mobile", component: MobileComponent },
  { path: "game", component: GameComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

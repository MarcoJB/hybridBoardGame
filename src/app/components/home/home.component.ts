import { Component, OnInit } from "@angular/core";
import { adjectives, nouns } from "../../../assets/words.json"
import {Router} from "@angular/router";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"]
})
export class HomeComponent implements OnInit {

  roomName: string;

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  newRoom(): void {
    const adjective = this.capitalizeFirstLetter(this.randomElement(adjectives));
    const noun = this.capitalizeFirstLetter(this.randomElement(nouns));
    this.roomName = adjective + noun;
    this.join();
  }

  randomElement(array: any[]): any {
    return array[Math.floor(Math.random() * array.length)];
  }

  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  join(): void {
    this.router.navigate([this.roomName]);
  }

}

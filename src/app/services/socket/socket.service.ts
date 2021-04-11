import { Injectable } from "@angular/core";
import {Message} from "../../datatypes/Message";

@Injectable({
  providedIn: "root"
})
export class SocketService {
  connected = false;
  uuid: string;
  private readonly socketURI: string = "wss://boardgameserver.marco93.de";
  // private readonly socketURI: string = "ws://localhost:3000";
  private socket: WebSocket;
  private callbacks = {};
  private stashedMessages: Message[] = [];

  constructor() { }

  init(): void {
    console.log("Initiate socket...");

    this.socket = new WebSocket(this.socketURI);

    this.socket.addEventListener("open", () => {
      this.connected = true;
      this.stashedMessages.forEach(message => this.realSend(message));
      console.log("Socket initiated.");
    });

    this.socket.addEventListener("message", messageRaw => {
      const message: Message = JSON.parse(messageRaw.data);
      if (this.callbacks.hasOwnProperty(message.type)) {
        this.callbacks[message.type].forEach(callback => callback(message));
      } else {
        console.log(message);
      }
    });
  }

  onMessage(type: string, callback): SocketService {
    if (!this.callbacks.hasOwnProperty(type)) {
      this.callbacks[type] = [callback];
    } else {
      this.callbacks[type].push(callback);
    }

    return this;
  }

  send(type: string, data?: any, recipient?: string): SocketService {
    const message = new Message(type, data, recipient);

    if (this.connected) {
      this.realSend(message);
    } else {
      this.stashedMessages.push(message);
    }

    return this;
  }

  private realSend(message: Message): void {
    this.socket.send(JSON.stringify(message));
  }
}

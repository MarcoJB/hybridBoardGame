import {SocketService} from "../services/socket/socket.service";
import * as Peer from "../libs/simplepeer";

class PeerConnection extends Peer {
  private readonly socketService: SocketService;
  private readonly uuid: string;
  private readonly partnerUUID: string;
  private readonly stream: MediaStream;
  private readonly initiator: boolean;

  constructor(sockerService: SocketService, uuid: string, partnerUUID: string, stream?: MediaStream) {
    super(stream ? {initiator: true, streams: [stream]} : {});

    this.socketService = sockerService;
    this.uuid = uuid;
    this.partnerUUID = partnerUUID;
    this.stream = stream;
    this.initiator = !!stream;

    this.addEventListeners();
  }

  addEventListeners(): void {
    super.on("signal", data => {
      this.socketService.send(this.initiator ? "OFFER" : "ANSWER", data, this.partnerUUID);
    });
    super.on("connect", () => {
      console.log("Connected with " + this.partnerUUID);
    });
    super.on("stream", () => {
      console.log("Stream incoming from " + this.partnerUUID);
    });
    super.on("error", (e) => {
      console.log("Error with " + this.partnerUUID + ": ", e);
      super.destroy();
    });
    super.on("close", () => {
      console.log("Connection closed from " + this.partnerUUID);
      super.destroy();
    });
  }

  on(...args): void {
    super.on(...args);
  }
}

export {PeerConnection};

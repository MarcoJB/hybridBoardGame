import * as Peer from "../libs/simplepeer";

class Camera {
  uuid: string;
  playerUUID: string;
  peer: Peer;
  video;
  canvas;
  context;
  selectedColors = [[230, 230, 230], [200, 200, 200], [175, 175, 175]];
  rotation = 0;
  streamActive = false;

  constructor(uuid: string, playerUUID: string) {
    this.uuid = uuid;
    this.playerUUID = playerUUID;
  }
}

export {Camera};

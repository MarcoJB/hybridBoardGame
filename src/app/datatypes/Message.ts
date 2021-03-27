class Message {
  from: string;
  to: string;
  type: string;
  data: string;

  constructor(type?: string, data?: any, from?: string, to?: string) {
    if (type) { this.type = type; }
    if (data) { this.data = data; }
    if (from) { this.from = from; }
    if (to) { this.to = to; }
  }
}

export {Message};

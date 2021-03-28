class Message {
  from: string;
  to: string;
  type: string;
  data: any;

  constructor(type?: string, data?: any, to?: string) {
    if (type) { this.type = type; }
    if (data) { this.data = data; }
    if (to) { this.to = to; }
  }
}

export {Message};

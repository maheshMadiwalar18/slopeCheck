export interface HttpTransport {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

export class FetchTransport implements HttpTransport {
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    return globalThis.fetch(url, init);
  }
}

import webApp from "../src/index";

export default {
  async fetch(request: Request): Promise<Response> {
    return webApp.fetch(request, { ...process.env } as unknown as never);
  },
};


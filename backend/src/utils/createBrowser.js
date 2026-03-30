import { chromium } from "playwright";

export const createBrowser = async () => {
  return await chromium.launch({
    headless: true,
    proxy: {
      server: "http://gate.smartproxy.com:10000", 
      username: "user123",
      password: "pass123",
    },
  });
};

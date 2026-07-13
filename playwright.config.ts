import { defineConfig,devices } from "@playwright/test";
export default defineConfig({testDir:"./e2e",use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||"http://127.0.0.1:3000",trace:"on-first-retry"},projects:[{name:"mobile-chrome",use:{...devices["Pixel 7"]}}],webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:"pnpm dev",url:"http://127.0.0.1:3000",reuseExistingServer:true}});

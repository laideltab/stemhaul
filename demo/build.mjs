import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("demo/dist", { recursive: true });
execSync("npx @tailwindcss/cli -i demo/demo.css -o demo/dist/app.css --minify", { stdio: "inherit" });
const res = await build({
  entryPoints: ["demo/entry.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  write: false,
  jsx: "automatic",
  tsconfig: "tsconfig.json",
  alias: { "next/link": "./demo/shims/next-link.tsx", "next/navigation": "./demo/shims/next-navigation.ts" },
  define: { "process.env.NEXT_PUBLIC_STATIC_DEMO": '"1"', "process.env.NODE_ENV": '"production"' },
});
const js = res.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
const css = readFileSync("demo/dist/app.css", "utf8");
const html = `<title>Stem Haul Demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>:root{color-scheme:light;--font-bricolage:"Bricolage Grotesque";--font-plex:"IBM Plex Sans";--font-plex-mono:"IBM Plex Mono"}</style>
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync("demo/dist/stemhaul-demo.html", html);
console.log("wrote demo/dist/stemhaul-demo.html", (html.length / 1024).toFixed(0), "KB");

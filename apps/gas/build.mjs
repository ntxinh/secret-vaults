import { build } from "esbuild";
import { copyFileSync } from "node:fs";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  globalName: "app",
  outfile: "dist/Code.js",
  footer: { js: "function doPost(e) { return app.doPost(e); }" },
});
copyFileSync("src/appsscript.json", "dist/appsscript.json");
console.log("built dist/Code.js");

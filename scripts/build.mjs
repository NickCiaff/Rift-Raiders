import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const distDir = join(root.pathname, "dist");
const sourceDir = join(root.pathname, "src");

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

mkdirSync(distDir, { recursive: true });

for (const file of ["index.html", "styles.css"]) {
  cpSync(join(root.pathname, file), join(distDir, file));
}

await build({
  bundle: true,
  entryPoints: [join(sourceDir, "app.js")],
  format: "iife",
  platform: "browser",
  target: ["chrome107", "safari16"],
  outfile: join(root.pathname, "app.js")
});

cpSync(join(root.pathname, "app.js"), join(distDir, "app.js"));

console.log("Static assets bundled to app.js and copied to dist/");

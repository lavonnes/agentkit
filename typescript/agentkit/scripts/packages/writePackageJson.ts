import fs from "fs";
import path from "path";
import pkg from "../../package.json" assert { type: "json" };

const targets = [
  {
    dir: "dist/esm",
    type: "module",
  },
  {
    dir: "dist/cjs",
    type: "commonjs",
  },
];

for (const { dir, type } of targets) {
  const outPath = path.join(process.cwd(), dir, "package.json");
  const json = {
    type,
    version: pkg.version,
  };
  fs.writeFileSync(outPath, JSON.stringify(json, null, 2) + "\n");
}

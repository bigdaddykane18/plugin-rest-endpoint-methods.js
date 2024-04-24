import esbuild from "esbuild";
import { copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { glob } from "glob";

const sharedOptions = {
  sourcemap: "external",
  sourcesContent: true,
  minify: false,
  allowOverwrite: true,
  packages: "external",
  format: "esm",
  platform: "neutral",
  target: "es2022",
};

async function main() {
  // Start with a clean slate
  await rm("pkg", { recursive: true, force: true });
  // Build the source code for a neutral platform as ESM
  await esbuild.build({
    entryPoints: await glob(["./src/*.ts", "./src/**/*.ts"]),
    outdir: "pkg/dist-src",
    bundle: false,
    ...sharedOptions,
    sourcemap: true,
  });

  // Remove the types file from the dist-src folder
  const typeFiles = await glob([
    "./pkg/dist-src/**/types.js.map",
    "./pkg/dist-src/**/types.js",
    "./pkg/dist-src/generated/*-types.js",
    "./pkg/dist-src/generated/*-types.js.map",
  ]);
  for (const typeFile of typeFiles) {
    await rm(typeFile);
  }

  // Copy the README, LICENSE to the pkg folder
  await copyFile("LICENSE", "pkg/LICENSE");
  await copyFile("README.md", "pkg/README.md");

  // Handle the package.json
  let pkg = JSON.parse((await readFile("package.json", "utf8")).toString());
  // Remove unnecessary fields from the package.json
  delete pkg.scripts;
  delete pkg.prettier;
  delete pkg.release;
  delete pkg.jest;
  await writeFile(
    "pkg/package.json",
    JSON.stringify(
      {
        ...pkg,
        files: ["dist-*/**"],
        types: "./dist-types/index.d.ts",
        exports: {
          ".": {
            import: "./dist-src/index.js",
            types: "./dist-types/index.d.ts",
            // Tooling currently are having issues with the "exports" field when there is no "default", ex: TypeScript, eslint
            default: "./dist-src/index.js",
          },
        },
        sideEffects: false,
      },
      null,
      2,
    ),
  );
}
main();

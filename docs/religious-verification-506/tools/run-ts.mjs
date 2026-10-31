// node run-ts.mjs <file.ts> — runs a TS file with the project's jiti.
import { createJiti } from "../../../node_modules/jiti/lib/jiti.mjs";
import { resolve } from "path";
const jiti = createJiti(import.meta.url, { fsCache: false, moduleCache: false });
await jiti.import(resolve(process.argv[2]));

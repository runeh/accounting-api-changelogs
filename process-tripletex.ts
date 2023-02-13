import { readJSON, writeJSON } from "https://deno.land/x/flat@0.0.15/mod.ts";
import sortKeys from "https://esm.sh/sort-keys@5.0.0";

/**
 * This just runs pretty-printing on the file
 */

// The filename is the first invocation argument
const filename = Deno.args[0]; // Same name as downloaded_filename
const data = await readJSON(filename);
await writeJSON(filename, sortKeys(data, { deep: true }), null, 2);

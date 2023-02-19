import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
import { orderBy } from "https://esm.sh/natural-orderby@3.0.2";
import swaggerParser from "https://esm.sh/@apidevtools/swagger-parser@10.1.0";
import converter from "https://esm.sh/swagger2openapi@7.0.8";
import { OpenAPIV3 } from "https://esm.sh/openapi-types@12.1.0";
import redent from "https://esm.sh/redent@4.0.0";
import wordWrap from "https://esm.sh/word-wrap@1.2.3";

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

type MyParam =
  | {
      kind: "param";
      name: string;
      deprecated?: boolean;
      required?: boolean;
      pIn: string;
    }
  | { kind: "ref"; target: string };

function parsePath(path: string, pathObj: OpenAPIV3.PathItemObject) {
  const commonParams = (pathObj.parameters ?? []).map<MyParam>((e) => {
    if ("$ref" in e) {
      return { kind: "ref", target: e["$ref"] };
    } else {
      const { name, deprecated, description, required } = e;
      const pIn = e.in;
      return { kind: "param", name, deprecated, description, required, pIn };
    }
  });

  const methods = Object.values(OpenAPIV3.HttpMethods)
    .map((e) => {
      const obj = pathObj[e];
      return obj && { method: e, value: obj };
    })
    .filter(notEmpty)
    .map((e) => {
      const { method, value } = e;
      const { description } = value;
      const params = (value.parameters ?? []).map<MyParam>((e) => {
        if ("$ref" in e) {
          return { kind: "ref", target: e["$ref"] };
        } else {
          const { name, deprecated, description, required } = e;
          const pIn = e.in;
          return {
            kind: "param",
            name,
            deprecated,
            description,
            required,
            pIn,
          };
        }
      });

      return {
        path,
        method,
        description,
        params: [...params, ...commonParams],
      };
    });

  return methods.flat();
}

function mungApi(doc: OpenAPIV3.Document) {
  const paths = Object.entries(doc.paths)
    .map(([name, val]) => (val ? { name, val } : undefined))
    .filter(notEmpty)
    .flatMap((e) => parsePath(e.name, e.val));

  return { paths };
}

type Munged = ReturnType<typeof mungApi>;

function prettyPrint(munged: Munged) {
  console.log("Operations");
  console.log("==========\n");
  const orderedPaths = orderBy(munged.paths, [(e) => e.path, (e) => e.method]);
  for (const path of orderedPaths) {
    console.log(path.method.toUpperCase(), path.path);
    const orderedParams = orderBy(path.params, [
      (e) => (e.kind === "param" ? e.pIn : "z"),
      (e) => (e.kind === "param" ? e.name : "z"),
    ]);

    const desc = wordWrap(path.description ?? "No description", { width: 76 });
    console.log(redent(desc, 2));

    console.log("  Params:");
    for (const param of orderedParams) {
      if (param.kind === "ref") {
        continue;
      }
      console.log(`    ${param.pIn.padEnd(6, " ")} ${param.name}`);
    }
    console.log("\n");
  }
}

async function grabOpenapi3() {
  const raw = await Deno.readTextFile("./tripletex-prod.json");
  const json = JSON.parse(raw);
  const foo = await converter.convertObj(json, {});
  const lal = await swaggerParser.dereference(foo.openapi);
  return lal;
}

async function main() {
  const raw = await Deno.readTextFile("./fiken.json");
  const json = JSON.parse(raw);
  const lal = await swaggerParser.dereference(json);
  prettyPrint(mungApi(lal as any));
}

main();

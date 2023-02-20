// import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
import { orderBy } from "https://esm.sh/natural-orderby@3.0.2";
import swaggerParser from "https://esm.sh/@apidevtools/swagger-parser@10.1.0";
import converter from "https://esm.sh/swagger2openapi@7.0.8";
import { OpenAPIV3 } from "https://esm.sh/openapi-types@12.1.0";
import redent from "https://esm.sh/redent@4.0.0";
import wordWrap from "https://esm.sh/word-wrap@1.2.3";

export default function invariant(
  condition: unknown,
  message?: string
): asserts condition {
  if (condition) {
    return;
  } else {
    throw new Error(message ?? "Invariant error");
  }
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

type MyParam =
  | {
      kind: "param";
      deprecated?: boolean;
      description?: string;
      name: string;
      pIn: string;
      refName?: string;
      required?: boolean;
    }
  | {
      kind: "ref";
      target: string;
    };

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

function parseParameterRef(
  name: string,
  param: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject
) {
  if ("$ref" in param) {
    throw new Error("Can this happen?");
  }

  const ret: MyParam = {
    pIn: param.in,
    kind: "param",
    name: param.name,
    deprecated: param.deprecated,
    required: param.required,
    refName: `#/components/parameters/${name}`,
  };

  return ret;
}

function mungApi(doc: OpenAPIV3.Document) {
  const paths = Object.entries(doc.paths)
    .map(([name, val]) => (val ? { name, val } : undefined))
    .filter(notEmpty)
    .flatMap((e) => parsePath(e.name, e.val));

  const parameters = Object.entries(doc.components?.parameters ?? {})
    .map(([name, val]) => (val ? { name, val } : undefined))
    .filter(notEmpty)
    .flatMap((e) => parseParameterRef(e.name, e.val));

  return { paths, parameters };
}

type Munged = ReturnType<typeof mungApi>;

function prettyPrint(munged: Munged) {
  const getParamRef = (ref: string) => {
    const item = munged.parameters.find((e) => e.refName === ref);
    invariant(item, `param ref not found: ${ref}`);
    return item;
  };

  console.log("Operations");
  console.log("==========\n");
  const orderedPaths = orderBy(munged.paths, [(e) => e.path, (e) => e.method]);
  for (const path of orderedPaths) {
    const resolvedParams = path.params.map((e) =>
      e.kind === "param" ? e : getParamRef(e.target)
    );

    console.log(path.method.toUpperCase(), path.path);
    const orderedParams = orderBy(resolvedParams, [
      (e) => (e.kind === "param" ? e.pIn : "z"),
      (e) => (e.kind === "param" ? e.name : "z"),
    ]);

    const desc = wordWrap(path.description ?? "No description", { width: 76 });
    console.log(redent(desc, 2));

    console.log("\n  Params:");
    for (const param of orderedParams) {
      if (param.refName) {
        console.log(
          `    ${param.pIn.padEnd(6, " ")} ${param.name} from ${param.refName}`
        );
      } else {
        console.log(`    ${param.pIn.padEnd(6, " ")} ${param.name}`);

        const desc = wordWrap(param.description ?? "No description", {
          width: 72,
        });
        console.log(redent(desc, 6));
      }
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
  // const lal = await swaggerParser.dereference(json);
  const munged = mungApi(json);
  prettyPrint(munged);
}

main();

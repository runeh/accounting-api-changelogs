import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
import { orderBy } from "https://esm.sh/natural-orderby@3.0.2";
import wordWrap from "https://esm.sh/word-wrap";

const optionalString = z
  .string()
  .optional()
  .transform((e) => (typeof e === "string" && e.trim() !== "" ? e : undefined));

const roughParameters = z
  .array(
    z.object({
      name: z.string(),
      in: z.string(),
      required: z.boolean().optional(),
      schema: z.unknown(),
    })
  )
  .transform((e) => {
    const byPath = e.filter((v) => v.in === "path");
    const byOther = e.filter((v) => v.in !== "path");
    const sortedOther = orderBy(byOther, [
      (e) => {
        switch (e.in) {
          case "path":
            return 1;
          case "query":
            return 2;
          case "body":
            return 3;
          default:
            return 4;
        }
      },
      (e) => e.name,
    ]);
    return [...byPath, ...sortedOther];
  });

const roughResponses = z
  .record(
    z.string(),
    z.object({
      description: optionalString,
      content: optionalString,
      schema: z.unknown(),
    })
  )
  .transform((e) =>
    Object.entries(e).map(([k, v]) => ({ statusCode: k, ...v }))
  );

const roughMethods = z
  .record(
    z.string(),
    z
      .object({
        description: optionalString,
        summary: optionalString,
        parameters: roughParameters,
        responses: roughResponses,
      })
      .transform((e) => {
        console.log("asdf", e);
        const { description, summary, ...rest } = e;
        return { ...rest, description: description ?? summary };
      })
  )
  .transform((e) =>
    Object.entries(e).map(([k, v]) => ({ method: k.toUpperCase(), ...v }))
  );

const roughPaths = z
  .record(z.string(), roughMethods)
  .transform((e) =>
    Object.entries(e).map(([k, v]) => {
      return { path: k, methods: v };
    })
  )
  .transform((arr) => orderBy(arr, [(e) => e.path]));

type x = z.infer<typeof roughResponses>;

const roughOpenApiSchema = z.object({
  paths: roughPaths,
});

function toLines(line: string | undefined) {
  if (line == null || line.trim() === "") {
    return [""];
  }
  return wordWrap(line.trim(), { width: 60, trim: true, indent: "" }).split(
    "\n"
  );
}

function prettyPrint(data: z.infer<typeof roughOpenApiSchema>) {
  const lines: string[] = [];

  for (const item of data.paths) {
    lines.push(item.path);
    for (const method of item.methods) {
      const descriptionParts = toLines(method.description);

      lines.push(`    ${method.method}:    ${descriptionParts[0]}`);
      if (descriptionParts.length > 1) {
        lines.push(...descriptionParts.slice(1).map((e) => `            ${e}`));
      }
      for (const param of method.parameters) {
        lines.push(`        ${param.in.padEnd(8, " ")} ${param.name}`);
      }
      lines.push("");
    }
    lines.push("");
  }

  console.log(lines.join("\n"));
  // console.log(JSON.stringify(sorted, null, 2));
}

// const raw = await Deno.readTextFile("./tripletex-prod.json");
const raw = await Deno.readTextFile("./fiken.json");
const json = JSON.parse(raw);
const parsed = roughOpenApiSchema.parse(json);
// console.log(JSON.stringify(parsed, null, 2));
prettyPrint(parsed);

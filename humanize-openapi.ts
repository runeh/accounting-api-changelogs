import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
import { orderBy } from "https://esm.sh/natural-orderby@3.0.2";

const roughOpenApiSchema = z.object({
  paths: z.record(
    z.string(),
    z.record(
      z.string(),
      z.object({
        description: z.string(),
        summary: z.string().optional(),
        parameters: z.array(
          z.object({
            name: z.string(),
            in: z.string(),
            required: z.boolean().optional(),
            schema: z.unknown(),
          })
        ),
        responses: z.record(
          z.string(),
          z.object({
            description: z.string(),
            content: z.unknown(),
            schema: z.unknown(),
          })
        ),
      })
    )
  ),
});

const methodOrder = ["get", "post", "put", "patch", "delete"];

function prettyPrint(data: z.infer<typeof roughOpenApiSchema>) {
  const items = Object.entries(data.paths).flatMap(([path, methodDefs]) => {
    const methods = Object.entries(methodDefs).map(([method, definition]) => {
      const params = orderBy(definition.parameters, [
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
      ]);
      return {
        method,
        definition,
        params,
        description: definition.description || definition.summary,
      };
    });
    return { path, methods: orderBy(methods, [(e) => e.method]) };
  });

  const sorted = orderBy(items, [(e) => e.path]);

  const lines: string[] = [];

  for (const item of sorted) {
    lines.push(item.path);
    for (const method of item.methods) {
      lines.push(`    ${method.method.toUpperCase()} - ${method.description}`);
      for (const param of method.params) {
        lines.push(`        ${param.in.padEnd(8, " ")} ${param.name}`);
      }
      lines.push("");
    }
    lines.push("");
  }

  console.log(lines.join("\n"));
  // console.log(JSON.stringify(sorted, null, 2));
}

const raw = await Deno.readTextFile("./tripletex-prod.json");
const json = JSON.parse(raw);
const parsed = roughOpenApiSchema.parse(json);

prettyPrint(parsed);

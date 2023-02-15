import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
import { orderBy } from "https://esm.sh/natural-orderby@3.0.2";

const roughOpenApiSchema = z.object({
  paths: z.record(
    z.string(),
    z.record(
      z.string(),
      z.object({
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
  const items = Object.entries(data.paths).flatMap(([path, methods]) => {
    return Object.entries(methods).map(([method, definition]) => {
      return { path, method, definition };
    });
  });

  const sorted = orderBy(items, [(e) => e.path, (e) => e.method]);

  const lines: string[] = [];

  for (const item of sorted) {
    lines.push(`${item.method.toUpperCase().padEnd(6, " ")} ${item.path}`);
  }

  console.log(lines);
  // console.log(
  //   JSON.stringify(
  //     sorted.map((e) => `${e.method.toUpperCase().padEnd(6, " ")} ${e.path}`),
  //     null,
  //     2
  //   )
  // );

  // console.log(JSON.stringify(sorted, null, 2));

  // const
}

const raw = await Deno.readTextFile("./tripletex-prod.json");
const json = JSON.parse(raw);
const parsed = roughOpenApiSchema.parse(json);

prettyPrint(parsed);

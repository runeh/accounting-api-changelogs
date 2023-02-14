import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";

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
const raw = await Deno.readTextFile("./tripletex-prod.json");
const json = JSON.parse(raw);
const parsed = roughOpenApiSchema.parse(json);

const items = Object.entries(parsed.paths).flatMap(([path, methods]) => {
  return Object.entries(methods).map(([method, definition]) => {
    return { path, method, definition };
  });
});

console.log(JSON.stringify(items, null, 2));

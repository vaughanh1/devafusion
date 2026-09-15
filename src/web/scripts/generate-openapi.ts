import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";

// log-entries.zod.ts itself imports ./zod-openapi-setup as its first
// statement, applying the extendZodWithOpenApi patch before it calls
// createSelectSchema/createInsertSchema - see that file for why the
// patch cannot simply be inlined here (ES module import hoisting).
import {
  logEntryInsertSchema,
  logEntrySelectSchema,
} from "@/features/log/schema/log-entries.zod";

// Spec-only for now (no public Swagger UI page) - generates a build-time
// artifact for internal/future reference. Deferring a public UI decision
// until there is a real API route surface worth documenting; this proof
// covers the engineering log's schema only, per this slice's tooling-only
// scope (production data migration and any real Route Handler are a
// separate, later slice).
const registry = new OpenAPIRegistry();

registry.register("LogEntry", logEntrySelectSchema.openapi("LogEntry"));
registry.register(
  "LogEntryInsert",
  logEntryInsertSchema.openapi("LogEntryInsert"),
);

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Devafusion API (spec-only, in-progress)",
    version: "0.0.0",
    description:
      "Machine-readable schema reference generated from Drizzle/Zod definitions. No public UI is served for this yet - see docs/adr/ for the decision to defer a Swagger UI page until a real API route surface exists.",
  },
});

const outputPath = join(process.cwd(), "openapi-docs.json");
writeFileSync(outputPath, JSON.stringify(document, null, 2));

console.log(`OpenAPI spec written to ${outputPath}`);

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod/v4";

// Side-effect-only module: patches the zod/v4 prototype so every schema
// created afterwards (createSelectSchema/createInsertSchema included)
// gets a working .openapi() method. Must be imported - for its side
// effect alone - by any module that both creates a Drizzle/Zod schema
// and expects .openapi() to exist on it. ES module imports are hoisted
// to the top of a file at evaluation time regardless of source order,
// so relying on "import this before that" within a single file does not
// work here - the patch has to live in its own dedicated module that is
// guaranteed to finish evaluating (imports resolve depth-first) before
// the schema-creation module's own top-level code runs.
extendZodWithOpenApi(z);

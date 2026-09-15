// Redundant with db/schema.ts's own server-only guard (it re-exports the
// same table), kept here too since this is the module a future form
// component is most likely to reach for directly.
import "server-only";

import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { logEntries } from "@/db/schema";

// Side-effect import: must resolve before createSelectSchema/
// createInsertSchema run below, so the schemas they return already have
// a working .openapi() method - see zod-openapi-setup.ts for why this
// has to be a separate module rather than an inline call in this file.
import "./zod-openapi-setup";

// Generated directly from the Drizzle table (db/schema.ts) rather than
// hand-authored - one schema definition drives the DB table, the runtime
// validation, and (via @asteasolutions/zod-to-openapi) the OpenAPI spec,
// so the three never drift out of sync with each other (DRY).
export const logEntrySelectSchema = createSelectSchema(logEntries);
export const logEntryInsertSchema = createInsertSchema(logEntries);

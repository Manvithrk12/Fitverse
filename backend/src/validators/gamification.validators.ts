import { z } from "zod";

export const historyLimitSchema = z.coerce.number().int().min(1).max(100).optional();

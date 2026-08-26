import { z } from "zod";

export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
export const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,20}$/;

export const sessionInputSchema = z.object({
  session_id: z.string().min(1, "session_id is required").max(128, "session_id too long"),
  text: z.string().min(1, "text must not be empty").max(2000, "text is too long"),
  request_id: z.string().max(128).optional(),
});

export const bookingFactsSchema = z.object({
  date: z
    .string()
    .regex(dateRegex, "Date must be in YYYY-MM-DD format")
    .optional()
    .or(z.literal(""))
    .or(z.null()),
  time: z
    .string()
    .regex(timeRegex, "Time must be in HH:MM format (24-hour)")
    .optional()
    .or(z.literal(""))
    .or(z.null()),
  party_size: z
    .union([
      z.number().int().min(1, "Party size must be at least 1").max(50, "Party size cannot exceed 50"),
      z.string().regex(/^\d+$/).transform(v => parseInt(v, 10)).refine(n => n >= 1 && n <= 50, "Party size must be between 1 and 50"),
      z.literal(""),
      z.null()
    ])
    .optional(),
  name: z.string().max(100, "Name cannot exceed 100 characters").optional().or(z.literal("")).or(z.null()),
  phone: z
    .string()
    .max(40, "Phone number is too long")
    .refine(v => !v || v === "" || phoneRegex.test(v), {
      message: "Phone number contains invalid characters"
    })
    .optional()
    .or(z.literal(""))
    .or(z.null()),
});

export const factsOverrideSchema = z.object({
  session_id: z.string().min(1, "session_id is required"),
  expected_version: z.number().int().nonnegative().optional(),
  facts: bookingFactsSchema,
});

export const sessionResetSchema = z.object({
  session_id: z.string().max(128).optional(),
});

export const sessionReplaySchema = z.object({
  session_id: z.string().min(1, "session_id is required"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  session_id: z.string().optional(),
});

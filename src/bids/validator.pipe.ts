import z from "zod";
import { Filter } from "bad-words";

const filter = new Filter();

export const BidSchema = z.object({
    job_reference: z.uuid({ message: "Job reference must be a valid UUID" }),

    proposed_amount: z
        .number()
        .int()
        .positive({ message: "Proposed amount must be greater than 0" }),
    note: z
        .string()
        .refine((val) => !filter.isProfane(val), {
            message: "Profanity is not allowed in the note field",
        })
        .optional(),
    estimated_days: z
        .number()
        .int()
        .positive({ message: "Estimated days must be greater than 0" })
        .optional(),
});

export type BidDto = z.infer<typeof BidSchema>;
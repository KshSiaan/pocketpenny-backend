import z from "zod";


export const JobSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    amount_offered_by_author_min: z.number().int().optional(),
    amount_offered_by_author_max: z.number().int().optional(),
    currency: z.string().length(3, { message: "Currency must be a 3-letter code" }).optional(),
    category_reference: z.uuid({ message: "Category reference must be a valid UUID" }),
})

export type JobDto = z.infer<typeof JobSchema>;


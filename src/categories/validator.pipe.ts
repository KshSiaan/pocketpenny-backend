import { z } from "zod"

export type CategoryIcon = {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
};

export const CategorySchema = z.object({
    parentId: z.string().optional(),
    name: z.string().min(1, { message: "Name is required" }),
    slug: z.string().min(1, { message: "Slug is required" }),
    description: z.string().optional(),
    icon: z.custom<CategoryIcon>(
        (file): file is CategoryIcon => {
            if (!file || typeof file !== "object") return false;
            const buffer = (file as { buffer?: unknown }).buffer;
            return Buffer.isBuffer(buffer) && buffer.length > 0;
        },
        { message: "Icon file is required" },
    ),
})

export const CategoryBodySchema = CategorySchema.omit({ icon: true });

export type CategoryDto = z.infer<typeof CategorySchema>;
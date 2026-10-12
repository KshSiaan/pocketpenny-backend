
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z, ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodType) { }

    transform(value: unknown, _metadata: ArgumentMetadata) {
        try {
            const parsedValue = this.schema.parse(value);
            return parsedValue;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new BadRequestException({
                    message: error?.issues[0].message || 'Validation failed',
                    errors: error.issues,
                });
            }

            throw error;
        }
    }
}

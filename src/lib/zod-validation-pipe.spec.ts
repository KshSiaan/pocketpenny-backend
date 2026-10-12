import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation-pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.object({
      name: z.string().min(1, 'Name is required'),
    }),
  );

  it('returns the parsed value when validation succeeds', () => {
    expect(pipe.transform({ name: 'Books' }, {} as never)).toEqual({
      name: 'Books',
    });
  });

  it('includes Zod issues in the bad request response', () => {
    try {
      pipe.transform({ name: '' }, {} as never);
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: 'Validation failed',
        errors: [
          expect.objectContaining({
            path: ['name'],
            message: 'Name is required',
          }),
        ],
      });
    }
  });
});

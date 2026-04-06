import { z } from 'zod';

export const catalogSchema = z
  .object({
    status: z.enum(['KEEP', 'DONATE', 'SELL', 'DISCARD'], {
      required_error: 'Status is required',
    }),
    condition_grade: z.enum(['MINT', 'GOOD', 'FAIR', 'POOR'], {
      required_error: 'Condition grade is required',
    }),
    condition_flags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    asking_price: z
      .number()
      .min(0.01, 'Price must be greater than 0')
      .nullable()
      .or(
        z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
          .transform((val) => (val === '' ? null : Number(val))),
      )
      .or(z.literal('').transform(() => null))
      .optional(),
    donation_dest: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === 'SELL' &&
      (data.asking_price === undefined || data.asking_price === null || data.asking_price <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Asking price is required when status is SELL',
        path: ['asking_price'],
      });
    }
    if (data.status === 'DONATE' && (!data.donation_dest || data.donation_dest.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Donation destination is required when status is DONATE',
        path: ['donation_dest'],
      });
    }
  });

/**
 * Helper to adapt Zod schema for Formik's validate function.
 * @param {z.ZodSchema} schema - The Zod schema to use.
 * @returns {Function} A Formik-compatible validation function.
 */
export const validateWithZod = (schema) => (values) => {
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });
  return errors;
};

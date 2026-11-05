import { z } from 'zod';

/**
 * Sanitizes a display name string:
 * - Strips script tags and contents
 * - Strips style tags and contents
 * - Strips all HTML tags
 * - Strips ASCII & Unicode control characters
 * - Collapses consecutive whitespace characters into a single space
 * - Trims leading and trailing spaces
 */
export function sanitizeDisplayName(name: string): string {
  if (typeof name !== 'string') return '';
  return name
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags and contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags and contents
    .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const displayNameSchema = z
  .string()
  .transform((val) => sanitizeDisplayName(val))
  .pipe(
    z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(24, 'Display name must be 24 characters or less')
  );

export const profileUpdateSchema = z.object({
  display_name: displayNameSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

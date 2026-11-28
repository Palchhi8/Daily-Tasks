const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, { message: 'name must be at least 2 characters' }).max(100),
  email: z.string().email({ message: 'A valid email address is required' }),
  password: z
    .string()
    .min(8, { message: 'password must be at least 8 characters long' })
    .max(100),
  role: z.enum(['MEMBER', 'ADMIN']).default('MEMBER')
});

const loginSchema = z.object({
  email: z.string().email({ message: 'A valid email address is required' }),
  password: z.string().min(1, { message: 'password cannot be blank' })
});

module.exports = {
  registerSchema,
  loginSchema
};

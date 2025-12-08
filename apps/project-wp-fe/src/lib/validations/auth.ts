import * as v from 'valibot'

export const emailSchema = v.pipe(
  v.string(),
  v.nonEmpty('Email is required'),
  v.email('Please enter a valid email')
)

export const otpSchema = v.pipe(
  v.string(),
  v.nonEmpty('Verification code is required'),
  v.length(6, 'Verification code must be 6 digits'),
  v.regex(/^\d+$/, 'Verification code must contain only numbers')
)

export const nameSchema = v.pipe(
  v.string(),
  v.nonEmpty('Name is required'),
  v.minLength(2, 'Name must be at least 2 characters')
)

export const emailStepSchema = v.object({
  email: emailSchema,
})

export const otpStepSchema = v.object({
  otp: otpSchema,
})

export const signUpOtpSchema = v.object({
  name: nameSchema,
  otp: otpSchema,
})

export type EmailStepFormData = v.InferOutput<typeof emailStepSchema>
export type OtpStepFormData = v.InferOutput<typeof otpStepSchema>
export type SignUpOtpFormData = v.InferOutput<typeof signUpOtpSchema>

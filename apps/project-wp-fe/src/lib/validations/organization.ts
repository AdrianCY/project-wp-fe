import * as v from 'valibot'

export const organizationNameSchema = v.pipe(
  v.string(),
  v.nonEmpty('Organization name is required'),
  v.minLength(2, 'Name must be at least 2 characters'),
  v.maxLength(100, 'Name must be less than 100 characters')
)

export const organizationSlugSchema = v.pipe(
  v.string(),
  v.nonEmpty('Slug is required'),
  v.minLength(2, 'Slug must be at least 2 characters'),
  v.maxLength(50, 'Slug must be less than 50 characters'),
  v.regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
)

export const createOrganizationSchema = v.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
})

export type CreateOrganizationFormData = v.InferOutput<typeof createOrganizationSchema>


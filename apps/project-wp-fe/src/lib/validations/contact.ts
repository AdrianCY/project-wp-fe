import * as v from "valibot";

export const phoneNumberSchema = v.pipe(
	v.string(),
	v.nonEmpty("Phone number is required"),
	v.minLength(10, "Phone number must be at least 10 digits"),
	v.maxLength(20, "Phone number must be less than 20 digits"),
	v.regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
);

export const contactNameSchema = v.pipe(
	v.string(),
	v.maxLength(255, "Name must be less than 255 characters"),
);

export const contactEmailSchema = v.pipe(
	v.string(),
	v.email("Please enter a valid email address"),
	v.maxLength(255, "Email must be less than 255 characters"),
);

export const createContactSchema = v.object({
	phoneNumber: phoneNumberSchema,
	name: v.optional(contactNameSchema),
	email: v.optional(
		v.union([v.pipe(v.string(), v.length(0)), contactEmailSchema]),
	),
});

export type CreateContactFormData = v.InferOutput<typeof createContactSchema>;

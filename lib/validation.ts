import { z } from "zod";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name").max(60),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(5, "Enter house / flat and street").max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  landmark: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.string().refine((s) => INDIAN_STATES.includes(s), "Select the state"),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
});

export type AddressInput = z.infer<typeof addressSchema>;

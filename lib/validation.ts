import { z } from "zod";
import { INDIAN_STATES } from "./constants";

export { INDIAN_STATES };

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

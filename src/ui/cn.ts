import { clsx, type ClassValue } from "clsx";

/** Join class names. No class merging: variants are exclusive by construction (CVA), and `!` overrides are banned. */
export const cn = (...inputs: ClassValue[]) => clsx(inputs);

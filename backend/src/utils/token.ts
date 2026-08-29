import { randomBytes } from "crypto";

export function generateOpaqueToken(): string {
  return randomBytes(48).toString("hex");
}

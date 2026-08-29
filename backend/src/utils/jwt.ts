import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "../generated/prisma/client";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  jti?: string; // unique token ID
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions["expiresIn"],
    },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}
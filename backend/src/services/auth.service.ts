import { AppError } from "../middleware/errorHandler";
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
} from "../repositories/refreshToken.repository";
import { createUser, findUserByEmail, findUserById } from "../repositories/user.repository";
import { hashToken } from "../utils/hashToken";
import { signAccessToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateOpaqueToken } from "../utils/token";
import { env } from "../config/env";
import type { Role } from "../generated/prisma/client";

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

function toPublicUser(user: { id: string; email: string; role: Role }): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

async function issueTokenPair(user: { id: string; role: Role }): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);
  await createRefreshToken(user.id, hashToken(refreshToken), expiresAt);

  return { accessToken, refreshToken };
}

export async function register(email: string, password: string): Promise<AuthResult> {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash);
  const tokens = await issueTokenPair(user);

  return { user: toPublicUser(user), ...tokens };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email);
  // Deliberately identical error for "no such user" and "wrong password" —
  // distinguishing them lets an attacker enumerate registered emails.
  if (!user) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(rawRefreshToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(rawRefreshToken);
  const record = await findRefreshTokenByHash(tokenHash);

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired refresh token", 401);
  }

  const user = await findUserById(record.userId);
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired refresh token", 401);
  }

  // Rotate: the presented token is single-use. Revoking it here means a
  // stolen-and-replayed old token fails on its next use.
  await revokeRefreshToken(record.id);
  const tokens = await issueTokenPair(user);

  return { user: toPublicUser(user), ...tokens };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }
  const record = await findRefreshTokenByHash(hashToken(rawRefreshToken));
  if (record && !record.revokedAt) {
    await revokeRefreshToken(record.id);
  }
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await revokeAllRefreshTokensForUser(userId);
}

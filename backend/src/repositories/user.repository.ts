import { prisma } from "../config/prisma";
import type { Role } from "../generated/prisma/client";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(email: string, passwordHash: string, role: Role = "USER") {
  return prisma.user.create({
    data: { email, passwordHash, role },
  });
}

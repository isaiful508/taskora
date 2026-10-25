import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { ApiError } from "../../middleware/error";
import type { LoginInput, SignupInput } from "./auth.schema";

function sanitizeUser(user: { id: string; name: string; email: string; role: "STUDENT" | "MENTOR" }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "STUDENT",
    },
  });

  const token = signToken({ sub: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken({ sub: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    throw ApiError.unauthorized("Account no longer exists");
  }
  return { user };
}

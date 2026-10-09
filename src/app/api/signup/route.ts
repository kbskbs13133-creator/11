import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { signupSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const body = signupSchema.parse(await req.json());
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new ApiError(409, "이미 가입된 이메일입니다.");

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: "USER", // 회원가입은 항상 USER (ADMIN 은 seed/DB 로만 생성)
      vipLevel: 1,
    },
    select: { id: true, email: true },
  });
  return ok({ user }, 201);
});

import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .refine(
      (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
        /^[a-zA-Z0-9_.-]{4,40}$/.test(value),
      "올바른 아이디 또는 이메일을 입력해주세요.",
    ),
  password: z.string().min(1, "비밀번호를 입력해주세요.").max(1024),
  next: z.string().max(2048).optional(),
});

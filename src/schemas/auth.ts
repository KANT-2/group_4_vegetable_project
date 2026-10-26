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

export const signUpSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(
        /^[a-zA-Z0-9_.-]{4,40}$/,
        "아이디는 영문·숫자·._- 조합의 4~40자로 입력해주세요.",
      ),
    email: z.string().trim().email("올바른 이메일을 입력해주세요."),
    nickname: z.string().trim().min(2).max(20),
    password: z.string().min(8, "비밀번호는 8자 이상 입력해주세요.").max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

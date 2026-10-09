import { z } from "zod";
import { AMOUNT_REGEX } from "./format";

export const amountSchema = z
  .string({ required_error: "금액을 입력해주세요." })
  .trim()
  .regex(AMOUNT_REGEX, "금액은 숫자(소수점 2자리까지)로 입력해주세요.")
  .refine((v) => Number(v) > 0, "금액은 0보다 커야 합니다.");

export const rateSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}(\.\d{1,4})?$/, "이율은 0~999.9999 사이 숫자로 입력해주세요.");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(30, "이름은 30자 이하로 입력해주세요."),
  email: z.string().trim().toLowerCase().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(100),
});

export const MAX_PRODUCTS = 10;

export const productSchema = z.object({
  name: z.string().trim().min(1, "상품명을 입력해주세요.").max(50, "상품명은 50자 이하입니다."),
  description: z.string().max(5000, "설명은 5000자 이하입니다.").default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  rates: z
    .array(
      z.object({
        termDays: z.coerce
          .number({ invalid_type_error: "기간(일)을 숫자로 입력해주세요." })
          .int("기간은 정수(일)로 입력해주세요.")
          .min(1, "기간은 1일 이상이어야 합니다.")
          .max(3650, "기간은 3650일 이하여야 합니다."),
        rate: rateSchema,
      })
    )
    .min(1, "기간별 이율을 1개 이상 등록해주세요.")
    .max(20, "기간별 이율은 최대 20개까지 등록할 수 있습니다.")
    .refine((rates) => new Set(rates.map((r) => r.termDays)).size === rates.length, "같은 기간이 중복되었습니다."),
});

export const depositSchema = z.object({
  productId: z.string().min(1),
  termDays: z.coerce.number().int().min(1),
  amount: amountSchema,
});

export const transactionRequestSchema = z.object({
  type: z.enum(["CHARGE", "WITHDRAW"]),
  amount: amountSchema,
  memo: z.string().trim().max(200).optional(),
});

export const vipLevelsSchema = z.object({
  levels: z
    .array(
      z.object({
        level: z.number().int().min(1).max(5),
        name: z.string().trim().min(1, "등급명을 입력해주세요.").max(20),
        bonusRate: rateSchema,
      })
    )
    .length(5),
});

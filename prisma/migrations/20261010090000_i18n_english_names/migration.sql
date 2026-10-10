-- 다국어(EN/KO) 지원: 영문 이름/설명 컬럼 추가
ALTER TABLE "Deposit" ADD COLUMN "productNameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN "descriptionEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VipLevel" ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';

-- 기본 VIP 등급명 영문 채우기
UPDATE "VipLevel" SET "nameEn" = 'Bronze' WHERE "name" = '브론즈';
UPDATE "VipLevel" SET "nameEn" = 'Silver' WHERE "name" = '실버';
UPDATE "VipLevel" SET "nameEn" = 'Gold' WHERE "name" = '골드';
UPDATE "VipLevel" SET "nameEn" = 'Platinum' WHERE "name" = '플래티넘';
UPDATE "VipLevel" SET "nameEn" = 'Diamond' WHERE "name" = '다이아몬드';

-- 샘플 상품 영문명 채우기 (관리자가 이름을 바꾸지 않은 경우에만)
UPDATE "Product" SET "nameEn" = 'Stable Point Deposit' WHERE "name" = '안정형 포인트 예치';
UPDATE "Product" SET "nameEn" = 'Short-Term Boost Deposit' WHERE "name" = '단기 부스트 예치';

-- 샘플 상품 설명: '원금 보장형' 표현 정리 + 영문 설명 (수정되지 않은 원문일 때만)
UPDATE "Product"
SET "description" = E'기본 예치 상품입니다.\n매일 자정 일할 계산된 이자가 자동 지급되며, 만기일에 원금이 자동 정산됩니다.'
WHERE "description" = E'원금 보장형 기본 예치 상품입니다.\n매일 자정 일할 계산된 이자가 자동 지급되며, 만기일에 원금이 자동 반환됩니다.';
UPDATE "Product"
SET "descriptionEn" = E'Our standard deposit product.\nInterest calculated on a daily basis is paid automatically every midnight, and the principal is settled automatically on the maturity date.'
WHERE "name" = '안정형 포인트 예치' AND "descriptionEn" = '';
UPDATE "Product"
SET "descriptionEn" = E'A short-term product offering a higher return over a short period.\nIt may be offered for a limited event period only.'
WHERE "name" = '단기 부스트 예치' AND "descriptionEn" = '';

-- 기존 예치건의 영문 상품명 스냅샷
UPDATE "Deposit" d SET "productNameEn" = p."nameEn" FROM "Product" p WHERE d."productId" = p."id" AND p."nameEn" <> '';

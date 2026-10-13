-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- 回填。已部署的实例里已经有一行 seed 出来的 admin，按列默认值它会被
-- 降成 user —— 那样 admin 的密码下限会从 12 位悄悄掉到 8 位，且不报错。
UPDATE "users" SET "role" = 'admin' WHERE "username" = 'admin';

-- CreateTable: tambah enum Role dan field role ke User
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

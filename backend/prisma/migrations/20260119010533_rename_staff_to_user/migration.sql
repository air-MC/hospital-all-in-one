/*
  Warnings:

  - The values [CONSULTATION,PENDING_EXAMS,SCHEDULED,COMPLETED] on the enum `SurgeryStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Staff` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `hospitalId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalId` to the `CarePlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalId` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalId` to the `SurgeryCase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surgeryTypeId` to the `SurgeryCase` table without a default value. This is not possible if the table is not empty.
  - Made the column `surgeryDate` on table `SurgeryCase` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "HospitalStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SurgeryCategory" AS ENUM ('SURGERY', 'PROCEDURE');

-- CreateEnum
CREATE TYPE "CareItemPriority" AS ENUM ('CRITICAL', 'NORMAL', 'INFO');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
BEGIN;
CREATE TYPE "SurgeryStatus_new" AS ENUM ('CONFIRMED', 'ADMITTED', 'IN_SURGERY', 'POST_OP', 'DISCHARGED', 'CANCELLED');
ALTER TABLE "SurgeryCase" ALTER COLUMN "status" TYPE "SurgeryStatus_new" USING ("status"::text::"SurgeryStatus_new");
ALTER TYPE "SurgeryStatus" RENAME TO "SurgeryStatus_old";
ALTER TYPE "SurgeryStatus_new" RENAME TO "SurgeryStatus";
DROP TYPE "SurgeryStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_hospitalId_fkey";

-- DropIndex
DROP INDEX "Slot_departmentId_startDateTime_idx";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "hospitalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "CarePlan" ADD COLUMN     "hospitalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CarePlanItem" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" "CareItemPriority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "status" "HospitalStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "hospitalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "doctorId" TEXT;

-- AlterTable
ALTER TABLE "SurgeryCase" ADD COLUMN     "hospitalId" TEXT NOT NULL,
ADD COLUMN     "roomNumber" TEXT,
ADD COLUMN     "surgeryTypeId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'CONFIRMED',
ALTER COLUMN "surgeryDate" SET NOT NULL;

-- DropTable
DROP TABLE "Staff";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitStep" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "category" "CareCategory",
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SurgeryCategory" NOT NULL,
    "isAdmissionRequired" BOOLEAN NOT NULL DEFAULT true,
    "defaultStayDays" INTEGER NOT NULL DEFAULT 1,
    "isPreOpExamRequired" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgeryType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "VisitStep_patientId_appointmentId_idx" ON "VisitStep"("patientId", "appointmentId");

-- CreateIndex
CREATE INDEX "Slot_departmentId_doctorId_startDateTime_idx" ON "Slot"("departmentId", "doctorId", "startDateTime");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStep" ADD CONSTRAINT "VisitStep_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStep" ADD CONSTRAINT "VisitStep_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryType" ADD CONSTRAINT "SurgeryType_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_surgeryTypeId_fkey" FOREIGN KEY ("surgeryTypeId") REFERENCES "SurgeryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

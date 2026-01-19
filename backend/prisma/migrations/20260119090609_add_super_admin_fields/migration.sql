/*
  Warnings:

  - A unique constraint covering the columns `[patientNo]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[departmentId,doctorId,dayOfWeek]` on the table `ScheduleRule` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hospitalId` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientNo` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_hospitalId_fkey";

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "hospitalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "patientNo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleRule" ADD COLUMN     "doctorId" TEXT;

-- AlterTable
ALTER TABLE "SurgeryType" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "medicationStopDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT,
ALTER COLUMN "hospitalId" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientNo_key" ON "Patient"("patientNo");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRule_departmentId_doctorId_dayOfWeek_key" ON "ScheduleRule"("departmentId", "doctorId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryType" ADD CONSTRAINT "SurgeryType_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

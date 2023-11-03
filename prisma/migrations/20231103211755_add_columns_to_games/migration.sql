/*
  Warnings:

  - Added the required column `actualHalfScore` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estimatedHalfLine` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overUnder` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `predictedHalfScore` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `winLoss` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "actualHalfScore" INTEGER NOT NULL,
ADD COLUMN     "estimatedHalfLine" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "gameId" INTEGER NOT NULL,
ADD COLUMN     "overUnder" TEXT NOT NULL,
ADD COLUMN     "predictedHalfScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "winLoss" TEXT NOT NULL;

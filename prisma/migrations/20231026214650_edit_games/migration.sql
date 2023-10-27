/*
  Warnings:

  - Added the required column `conferenceGame` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `divisionGame` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `season` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seasonType` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "conferenceGame" BOOLEAN NOT NULL,
ADD COLUMN     "divisionGame" BOOLEAN NOT NULL,
ADD COLUMN     "season" INTEGER NOT NULL,
ADD COLUMN     "seasonType" TEXT NOT NULL;

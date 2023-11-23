/*
  Warnings:

  - You are about to drop the column `awayPeriods` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `conferenceGame` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `divisionGame` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `homePeriods` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `neutralSite` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "awayPeriods",
DROP COLUMN "conferenceGame",
DROP COLUMN "divisionGame",
DROP COLUMN "homePeriods",
DROP COLUMN "neutralSite",
ADD COLUMN     "gameData" JSONB;

import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const gameRouter = createTRPCRouter({
  getGamesByDate: publicProcedure.input(z.date()).query(({ ctx, input }) => {
    try {
      const today = new Date(input);
      console.log(today);
      // today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const games = ctx.db.game.findMany({
        where: {
          AND: [
            {
              date: {
                gte: today,
              },
            },
            {
              date: {
                lt: tomorrow,
              },
            },
          ],
        },
        select: {
          id: true,
          date: true,
          createdAt: true,
          updatedAt: true,
          homeTeam: {
            select: {
              id: true,
              team: true,
              awayGames: true,
              homeGames: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              team: true,
              awayGames: true,
              homeGames: true,
            },
          },
          awayPeriods: true,
          homePeriods: true,
          actualHalfScore: true,
          predictedHalfScore: true,
          estimatedHalfLine: true,
          winLoss: true,
        },
      }).then((data) => {
        return data;
      }).catch((error) => {
        console.error("Error fetching games:", error);
        throw new Error("Failed to fetch games");
      })
      return games;
    } catch (error) {
      console.error("Error fetching games:", error);
      throw new Error("Failed to fetch games");
    }
  }),
});

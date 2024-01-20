import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const gameRouter = createTRPCRouter({
  getGamesByDate: publicProcedure.input(z.date()).query(({ ctx, input }) => {
    try {
       // Parse the input as a UTC date string "YYYY-MM-DD"
       console.log("input", input)
       const inputDate = new Date(input);
       console.log("inputDate", inputDate)
       const inputAsUTC = Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate());
 
       // Create a Date object for the start of the input day in UTC
       const todayUTC = new Date(inputAsUTC);
 
       // Create a Date object for the start of the next day in UTC
       const tomorrowUTC = new Date(inputAsUTC);
       tomorrowUTC.setUTCDate(todayUTC.getUTCDate() + 1);
      const games = ctx.db.game.findMany({
        where: {
          AND: [
            {
              date: {
                gte: todayUTC,
              },
            },
            {
              date: {
                lt: tomorrowUTC,
              },
            },
          ],
        },
        orderBy: {
          date: "asc",
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

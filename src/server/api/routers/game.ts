import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Helper function to determine if a date is during Daylight Saving Time in the Central Time Zone
function isDaylightSaving(date: Date): boolean {
  const year = date.getFullYear();
  // Start and end dates of DST for the Central Time Zone
  const dstStart = new Date(`March 14, ${year} 02:00:00 CST`);
  const dstEnd = new Date(`November 07, ${year} 02:00:00 CST`);
  return date >= dstStart && date < dstEnd;
}

export const gameRouter = createTRPCRouter({
  getGamesByDate: publicProcedure.input(z.object({
    date: z.date(),
    limit: z.number().optional(),
    skip: z.number().optional(),
  })).query(async({ ctx, input }) => {
    try {
      // Parse the input as a UTC date string "YYYY-MM-DD"
      console.log("input", input)
      const inputDate = new Date(input.date);

      // Determine if the input date is in CST or CDT
      const centralTimeOffset = isDaylightSaving(inputDate) ? -5 : -6;

      // Adjust the input date to the beginning of the day in Central Time
      inputDate.setUTCHours(-centralTimeOffset, 0, 0, 0);

      // Create a Date object for the start of the input day in Central Time
      const todayCentralTime = new Date(inputDate);

      // Create a Date object for the start of the next day in Central Time
      const tomorrowCentralTime = new Date(inputDate);
      tomorrowCentralTime.setUTCDate(todayCentralTime.getUTCDate() + 1);
      const gamesPromise = ctx.db.game.findMany({
        where: {
          AND: [
            {
              date: {
                gte: todayCentralTime,
              },
            },
            {
              date: {
                lt: tomorrowCentralTime,
              },
            },
          ],
        },
        orderBy: {
          date: "asc",
        },
        take: input.limit,
        skip: input.skip,
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
      });
      const countPromise = ctx.db.game.count({
        where: {
          AND: [
            {
              date: {
                gte: todayCentralTime,
              },
            },
            {
              date: {
                lt: tomorrowCentralTime,
              },
            },
          ],
        },
      });
      const [games, totalCount] = await Promise.all([gamesPromise, countPromise]);
      return {
        games,
        totalCount,
      };
    } catch (error) {
      console.error("Error fetching games:", error);
      throw new Error("Failed to fetch games");
    }
  }),
});

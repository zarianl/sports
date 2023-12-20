import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const gameRouter = createTRPCRouter({
  getGamesByDate: publicProcedure.input(z.date()).query(({ ctx, input }) => {
    const today = new Date(input);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return ctx.db.game.findMany({
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
          },
        },
        awayTeam: {
          select: {
            id: true,
            team: true,
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
  }),
});

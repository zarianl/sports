import axios from "axios";
import { type SportspageGameFeed } from "~/types";
import { getAverageFirstHalfScore } from "~/utils/getAverageFirstHalfScore";
import { db } from "~/server/db";

const options = {
  method: "GET",
  url: "https://sportspage-feeds.p.rapidapi.com/games",
  params: {
    odds: "total",
    league: "NCAAB",
    date: `2023-02-02,2023-12-31`,
    skip: 0,
  },
  headers: {
    "X-RapidAPI-Key": "e535d42c74msha27d666909c4fc1p19240bjsne0308eef1af3",
    "X-RapidAPI-Host": "sportspage-feeds.p.rapidapi.com",
  },
};

export async function seedGames() {
  // await db.game.deleteMany({});
  let skip = 0;
  let results = [];
  do {
    // options.params.date = new Date().toISOString().split('T')[0]!
    options.params.skip = skip;
    const sportsPageGames: SportspageGameFeed = await axios.request(options);
    results = sportsPageGames.data.results;
    console.log("results", results);

    for (const game of results) {
      let awayTeam = await db.team.findUnique({
        where: {
          team: game.teams.away.team,
          mascot: game.teams.away.mascot,
        },
        include: { awayGames: true, homeGames: true },
      });
      if (!awayTeam) {
        if (!game.teams.away.team || !game.teams.away.mascot) return
        awayTeam = await db.team.create({
          data: {
            team: game.teams.away.team,
            mascot: game.teams.away.mascot,
            location: game.teams.away.location,
            conference: game.teams.away.conference,
            division: game.teams.away?.division || null,
          },
          include: { awayGames: true, homeGames: true },
        });
      }
      let homeTeam = (await db.team.findUnique({
        where: { team: game.teams.home.team, mascot: game.teams.home.mascot },
        include: { homeGames: true, awayGames: true },
      }))
      if (!homeTeam) {
        if (!game.teams.home.team || !game.teams.home.mascot) return
        homeTeam = await db.team.create({
          data: {
            team: game.teams.home.team,
            mascot: game.teams.home.mascot,
            location: game.teams.home.location,
            conference: game.teams.home.conference,
            division: game.teams.home?.division || null,
          },
          include: { awayGames: true, homeGames: true },
        });
      }

      let awayScore,
        homeScore,
        predictedHalfLine = 0;
      if (homeTeam?.abbreviation && awayTeam?.abbreviation) {
        awayScore =
          Math.round(
            ((getAverageFirstHalfScore(homeTeam, "home", "scores") +
              getAverageFirstHalfScore(awayTeam, "away", "allow")) /
              2) *
              10,
          ) / 10;
        homeScore =
          Math.round(
            ((getAverageFirstHalfScore(homeTeam, "away", "scores") +
              getAverageFirstHalfScore(awayTeam, "home", "allow")) /
              2) *
              10,
          ) / 10;
        predictedHalfLine = Math.round((awayScore + homeScore) * 10) / 10;
      }
      const actualHalfLine =
        game.scoreboard?.score.awayPeriods?.[0] !== undefined &&
        game.scoreboard?.score.homePeriods?.[0] !== undefined
          ? game.scoreboard.score.awayPeriods[0] +
            game.scoreboard.score.homePeriods[0]
          : null;

      const estimatedHalfLine = game.odds?.[0]?.total?.open?.total
        ? Math.round(game.odds[0].total.open.total * 0.5 * 2) / 2
        : null;

      const overUnder =
        estimatedHalfLine !== null
          ? predictedHalfLine < estimatedHalfLine
            ? "Under"
            : "Over"
          : null;

      const winLoss =
        actualHalfLine === null || estimatedHalfLine === null
          ? null
          : (actualHalfLine > estimatedHalfLine && overUnder === "Over") ||
            (actualHalfLine < estimatedHalfLine && overUnder === "Under")
          ? "Win"
          : "Loss";

      if (awayTeam && homeTeam) {
        const existingGame = await db.game.findUnique({
          where: { gameId: game.gameId },
        });
        if (existingGame) {
          await db.game.update({
            where: { gameId: game.gameId },
            data: {
              awayPeriods: game.scoreboard.score?.awayPeriods || null,
              homePeriods: game.scoreboard.score?.homePeriods || null,
              estimatedHalfLine: estimatedHalfLine,
              actualHalfScore: actualHalfLine,
              winLoss: winLoss,
              gameData: JSON.parse(JSON.stringify(game)),
            },
          });
        } else {
          await db.game.create({
            data: {
              date: new Date(game.schedule.date),
              seasonType: game.details.seasonType,
              season: game.details.season,
              gameId: game.gameId,
              awayTeam: {
                connect: { id: awayTeam.id }, // add this line
              },
              homeTeam: {
                connect: { id: homeTeam.id }, // and this line
              },
              awayPeriods: game.scoreboard?.score?.awayPeriods || [],
              homePeriods: game.scoreboard?.score?.homePeriods || [],
              predictedHalfScore: predictedHalfLine,
              estimatedHalfLine: estimatedHalfLine,
              actualHalfScore: actualHalfLine,
              overUnder: overUnder,
              winLoss: winLoss,
              gameData: JSON.parse(JSON.stringify(game)),
            },
          });
        }
      }
    }
    skip += 100;
  } while (results.length > 0 && skip < 2000);
}

seedGames()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect()
      .then(() => console.log("Disconnected from Prisma"))
      .catch((e) => console.error("Error disconnecting from Prisma:", e));
  });

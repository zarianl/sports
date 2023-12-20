import { getAverageFirstHalfScore } from "~/utils/getAverageFirstHalfScore";
import {
  type TeamWithGames,
  type SportspageGame,
  type ExtendedTeam,
} from "~/types";

export const getGamePredictions = (
  game: SportspageGame,
  teams: TeamWithGames[] | ExtendedTeam[],
) => {
  const homeTeam = teams.find((t) => t.team === game.teams.home.team)!;
  const awayTeam = teams.find((t) => t.team === game.teams.away.team)!;
  let awayScore = 0,
    homeScore = 0,
    predictedScore = 0;
  if (homeTeam && awayTeam) {
    awayScore =
      Math.round(
        ((getAverageFirstHalfScore(homeTeam as ExtendedTeam, "home", "scores") +
          getAverageFirstHalfScore(awayTeam as ExtendedTeam, "away", "allow")) /
          2) *
          10,
      ) / 10;
    homeScore =
      Math.round(
        ((getAverageFirstHalfScore(homeTeam as ExtendedTeam, "away", "scores") +
          getAverageFirstHalfScore(awayTeam as ExtendedTeam, "home", "allow")) /
          2) *
          10,
      ) / 10;

    predictedScore = Math.round((awayScore + homeScore) * 10) / 10;
  }
  const awayPeriodsScore = game.scoreboard?.score?.awayPeriods[0] ?? 0;
  const homePeriodsScore = game.scoreboard?.score?.homePeriods[0] ?? 0;
  const halfTimeScore = awayPeriodsScore + homePeriodsScore ?? null;

  const predictedHalfLine = game.odds?.[0]
    ? Math.round(game.odds[0].total.current.total * 0.46 * 2) / 2
    : 0;

  const overUnder = predictedScore < predictedHalfLine ? "under" : "over";
  let winLoss: string | null = null;
  if (halfTimeScore !== null && game.status !== "in progress") {
    winLoss =
      (predictedScore < predictedHalfLine &&
        halfTimeScore > predictedHalfLine) ||
      (predictedScore > predictedHalfLine && halfTimeScore < predictedHalfLine)
        ? "Loss"
        : "Win";
  }

  if (!homeTeam || !awayTeam || !awayScore || !homeScore || !predictedScore) {
    return;
  }

  return {
    ...game,
    homeTeam,
    awayTeam,
    awayScore: awayScore ? awayScore : 0,
    homeScore: homeScore ? homeScore : 0,
    predictedScore: predictedScore,
    predictedHalfLine: predictedHalfLine,
    overUnder: overUnder ? overUnder : "",
    halfTimeScore,
    winLoss,
  };
};

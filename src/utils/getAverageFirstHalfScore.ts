import { type ExtendedTeam } from "~/types";

export const getAverageFirstHalfScore = (
  team: ExtendedTeam,
  homeOrAway: "home" | "away",
  scoresOrAllow: "scores" | "allow",
  season?: number | string,
) => {
  let totalScore = 0;
  let totalGames = 0;

  const awayGames = team.awayGames.filter((game) => {
    if (season && typeof season === "number") {
      return game.season === season;
    }
    return true;
  }
  );
  const homeGames = team.homeGames.filter((game) => {
    if (season && typeof season === "number") {
      return game.season === season;
    }
    return true;
  }
  );

  try {
    awayGames.forEach((game) => {
      if (
        scoresOrAllow === "scores" &&
        homeOrAway === "away" &&
        Array.isArray(game.awayPeriods) &&
        game.awayPeriods.length > 0
      ) {
        totalScore += Number(game.awayPeriods[0]);
        totalGames++;
      }
      if (
        scoresOrAllow === "allow" &&
        homeOrAway === "home" &&
        Array.isArray(game.homePeriods) &&
        game.homePeriods.length > 0
      ) {
        totalScore += Number(game.homePeriods[0]);
        totalGames++;
      }
    });

    homeGames.forEach((game) => {
      if (
        scoresOrAllow === "scores" &&
        homeOrAway === "home" &&
        Array.isArray(game.homePeriods) &&
        game.homePeriods.length > 0
      ) {
        totalScore += Number(game.homePeriods[0]);
        totalGames++;
      }
      if (
        scoresOrAllow === "allow" &&
        homeOrAway === "away" &&
        Array.isArray(game.awayPeriods) &&
        game.awayPeriods.length > 0
      ) {
        totalScore += Number(game.awayPeriods[0]);
        totalGames++;
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(
        `Error calculating average first half score: ${error.message}`,
      );
    } else {
      console.error(
        `Error calculating average first half score: $${String(error)}`,
      );
    }
  }

  return totalGames > 0 ? totalScore / totalGames : 0;
};

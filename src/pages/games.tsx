import {
  AppBar,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import axios from "axios";
import { type GetServerSideProps } from "next";
import { getAverageFirstHalfScore } from "~/utils/getAverageFirstHalfScore";
import {
  type TeamWithGames,
  type SportspageGame,
  type TeamsPageProps,
  type SportspageGameFeed,
  type ExtendedTeam,
  ExtendedGame,
  GamesPageProps,
} from "~/types";
import { db } from "~/server/db";
import { type Game } from "@prisma/client";

const getGamePredictions = (
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

export const getServerSideProps: GetServerSideProps<{
  dbGames: ExtendedGame[];
}> = async () => {
  let games;

  // try {
  //   teams = await db.team.findMany({
  //     include: {
  //       awayGames: true,
  //       homeGames: true,
  //     },
  //   });
  // } catch (e) {
  //   console.error(e);
  // } finally {
  //   await db.$disconnect();
  // }

  // // If teams is not defined, return default props
  // if (!teams) {
  //   return {
  //     props: {
  //       teams: [],
  //       dbGames: [],
  //     },
  //   };
  // }

  // teams = teams.map((team) => ({
  //   ...team,
  //   createdAt: (team.createdAt instanceof Date
  //     ? team.createdAt
  //     : new Date(team.createdAt)
  //   ).toISOString(),
  //   updatedAt: (team.updatedAt instanceof Date
  //     ? team.updatedAt
  //     : new Date(team.updatedAt)
  //   ).toISOString(),
  //   awayGames: team.awayGames.map((game) => ({
  //     ...game,
  //     date: (game.date instanceof Date
  //       ? game.date
  //       : new Date(game.date)
  //     ).toISOString(),
  //     createdAt: (game.createdAt instanceof Date
  //       ? game.createdAt
  //       : new Date(game.createdAt)
  //     ).toISOString(),
  //     updatedAt: (game.updatedAt instanceof Date
  //       ? game.updatedAt
  //       : new Date(game.updatedAt)
  //     ).toISOString(),
  //   })),
  //   homeGames: team.homeGames.map((game) => ({
  //     ...game,
  //     date: (game.date instanceof Date
  //       ? game.date
  //       : new Date(game.date)
  //     ).toISOString(),
  //     createdAt: (game.createdAt instanceof Date
  //       ? game.createdAt
  //       : new Date(game.createdAt)
  //     ).toISOString(),
  //     updatedAt: (game.updatedAt instanceof Date
  //       ? game.updatedAt
  //       : new Date(game.updatedAt)
  //     ).toISOString(),
  //   })),
  // })) as TeamWithGames[];

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    games = await db.game.findMany({
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
  } catch (e) {
    console.error(e);
  } finally {
    await db.$disconnect();
  }

  games = games?.map((game) => ({
    ...game,
    date: game.date.toISOString(),
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  }));

  return {
    props: {
      // teams: (JSON.parse(JSON.stringify(teams)) as ExtendedTeam[]) ?? [],
      dbGames: (JSON.parse(JSON.stringify(games)) as ExtendedGame[]) ?? [],
    },
  };
};

const GamesPage: React.FC<GamesPageProps> = ({ dbGames }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [games, setGames] = useState<ExtendedGame[]>(dbGames);

  const getGamesFromDb = async (date: string | number | Date) => {
    let games: ExtendedGame[] = [];
    try {
      const today = new Date(date);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      games = await db.game.findMany({
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
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      await db.$disconnect();
    }

    setGames(games);
  };

  const handleDateChange = async (date: Date | null) => {
    if (!date) {
      return;
    }
    await getGamesFromDb(date);

    setSelectedDate(date);
  };

  return (
    <Container>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            <TextField
              id="date"
              label="Game Date"
              type="date"
              defaultValue={selectedDate}
              onChange={(event) =>
                handleDateChange(new Date(event.target.value))
              }
              InputLabelProps={{
                shrink: true,
              }}
            />
            {/* Wins: {wins}
            Losses: {loss}
            Win Rate: {wins && loss ? ((loss / wins) * 100).toFixed(2) : "N/A"}%
            Today's Win Rate:{" "}
            {games && games.length > 0
              ? (
                  (games.filter((game: any) => game.winLoss === "Win").length /
                    games.filter((game: any) => game.winLoss !== null).length) *
                  100
                ).toFixed(2)
              : "N/A"}
            % */}
          </Typography>
        </Toolbar>
      </AppBar>
      {Array.isArray(games) && games.length > 0 && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Away Team</TableCell>
                <TableCell>Home Team</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Predicted Score</TableCell>
                <TableCell>Estimated Half Line</TableCell>
                <TableCell>Away Periods</TableCell>
                <TableCell>Home Periods</TableCell>
                <TableCell>Actual Half Score</TableCell>
                <TableCell>Win/Loss</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {games?.map((game, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell>{game.awayTeam?.team}</TableCell>
                    <TableCell>{game.homeTeam?.team}</TableCell>
                    <TableCell>
                      {new Date(game.date).toLocaleString("en-US", {
                        timeZone: "America/Chicago",
                      })}
                    </TableCell>
                    <TableCell>{game.predictedHalfScore}</TableCell>

                    <TableCell>{game.estimatedHalfLine ?? " "}</TableCell>
                    <TableCell>{game.awayPeriods[0]}</TableCell>
                    <TableCell>{game.homePeriods[0]}</TableCell>
                    <TableCell>{game.actualHalfScore}</TableCell>
                    <TableCell>{game.winLoss}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default GamesPage;

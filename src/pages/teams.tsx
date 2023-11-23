/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { type GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Container,
  Button,
  Modal,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  TextField,
} from "@mui/material";
import { useState } from "react";
import { type SelectChangeEvent } from "@mui/material";
import { type ExtendedTeam } from "~/types";

const prisma = new PrismaClient();

export const getServerSideProps: GetServerSideProps = async () => {
  const teams: ExtendedTeam[] = await prisma.team.findMany({
    include: { awayGames: true, homeGames: true },
  });

  return {
    props: {
      teams,
    },
  };
};

interface TeamsPageProps {
  teams: TeamWithGames[];
}

interface TeamWithGames {
  id: number;
  team: string;
  location: string;
  conference: string;
  division: string;
  abbreviation: string;
  awayGames: GameWithoutTimestamps[];
  homeGames: GameWithoutTimestamps[];
}

interface GameWithoutTimestamps {
  id: number;
  seasonType: string;
  awayPeriods: unknown;
  homePeriods: unknown;
}

const getAverageFirstHalfScore = (
  team: TeamWithGames,
  homeOrAway: "home" | "away",
  scoresOrAllow: "scores" | "allow",
) => {
  let totalScore = 0;
  let totalGames = 0;

  try {
    team.awayGames.forEach((game) => {
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

    team.homeGames.forEach((game) => {
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

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  pt: 2,
  px: 4,
  pb: 3,
};

const defaultTeam: TeamWithGames = {
  id: 0,
  team: "",
  location: "",
  conference: "",
  division: "",
  abbreviation: "",
  awayGames: [],
  homeGames: [],
};
const TeamsPage: React.FC<TeamsPageProps> = ({ teams }) => {
  const [open, setOpen] = useState(false);
  const [homeTeam, setHomeTeam] = useState<string>();
  const [awayTeam, setAwayTeam] = useState<string>();
  const [line, setLine] = useState<number>();

  const handleChangeTeam = (
    event: SelectChangeEvent,
    destination: "home" | "away",
  ) => {
    const value = event.target.value as string;
    if (destination === "home") {
      setHomeTeam(value);
    } else if (destination === "away") {
      setAwayTeam(value);
    }
  };
  return (
    <Container>
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
        Open Modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <Box
          height="50vh"
          bgcolor="background.paper"
          width={"50%"}
          sx={{ ...style }}
        >
          <Grid container spacing={2}>
            <Grid item xs={5}>
              <FormControl fullWidth>
                <InputLabel id="team1-label">Home Team</InputLabel>
                <Select
                  labelId="team1-label"
                  id="team1"
                  value={homeTeam}
                  onChange={(event) => handleChangeTeam(event, "home")}
                >
                  {teams
                    .sort((a, b) => a.team.localeCompare(b.team))
                    .map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.team}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2}>
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
              >
                <Typography variant="h4">VS</Typography>
              </Box>
            </Grid>
            <Grid item xs={5}>
              <FormControl fullWidth>
                <InputLabel id="team2-label">Away Team</InputLabel>
                <Select
                  labelId="team2-label"
                  id="team2"
                  value={awayTeam}
                  onChange={(event) => handleChangeTeam(event, "away")}
                >
                  {teams
                    .sort((a, b) => a.team.localeCompare(b.team))
                    .map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.team}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <TextField
                  id="line"
                  label="Line"
                  type="number"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  value={line}
                  onChange={(event: React.ChangeEvent<{ value: unknown }>) =>
                    setLine(event.target.value as number)
                  }
                />
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="h6">
            Home Average Score:{" "}
            {Math.round(
              ((getAverageFirstHalfScore(
                teams.find((t) => t.id === Number(homeTeam)) ?? defaultTeam,
                "home",
                "scores",
              ) +
                getAverageFirstHalfScore(
                  teams.find((t) => t.id === Number(awayTeam)) ?? defaultTeam,
                  "away",
                  "allow",
                )) /
                2) *
                10,
            ) / 10}
          </Typography>

          <Typography variant="h6">
            Away Average Score:{" "}
            {Math.round(
              ((getAverageFirstHalfScore(
                teams.find((t) => t.id === Number(homeTeam)) ?? defaultTeam,
                "away",
                "scores",
              ) +
                getAverageFirstHalfScore(
                  teams.find((t) => t.id === Number(awayTeam)) ?? defaultTeam,
                  "home",
                  "allow",
                )) /
                2) *
                10,
            ) / 10}
          </Typography>
          <Typography variant="h6">
            Total Average Score:{" "}
            {Math.round(
              ((getAverageFirstHalfScore(
                teams.find((t) => t.id === Number(homeTeam)) ?? defaultTeam,
                "home",
                "scores",
              ) +
                getAverageFirstHalfScore(
                  teams.find((t) => t.id === Number(awayTeam)) ?? defaultTeam,
                  "away",
                  "allow",
                )) /
                2 +
                (getAverageFirstHalfScore(
                  teams.find((t) => t.id === Number(homeTeam)) ?? defaultTeam,
                  "away",
                  "scores",
                ) +
                  getAverageFirstHalfScore(
                    teams.find((t) => t.id === Number(awayTeam)) ?? defaultTeam,
                    "home",
                    "allow",
                  )) /
                  2) *
                10,
            ) / 10}
          </Typography>
        </Box>
      </Modal>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Team</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Conference</TableCell>
              <TableCell>Abbreviation</TableCell>
              <TableCell>Avg Home Half Scores</TableCell>
              <TableCell>Avg Away Half Scores</TableCell>
              <TableCell>Avg Home Half Allows</TableCell>
              <TableCell>Avg Away Half Allows</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>{team.team}</TableCell>
                <TableCell>{team.location}</TableCell>
                <TableCell>{team.conference}</TableCell>
                <TableCell>{team.abbreviation}</TableCell>
                <TableCell>
                  {Math.round(
                    getAverageFirstHalfScore(team, "home", "scores") * 10,
                  ) / 10}
                </TableCell>
                <TableCell>
                  {Math.round(
                    getAverageFirstHalfScore(team, "away", "scores") * 10,
                  ) / 10}
                </TableCell>
                <TableCell>
                  {Math.round(
                    getAverageFirstHalfScore(team, "home", "allow") * 10,
                  ) / 10}
                </TableCell>
                <TableCell>
                  {Math.round(
                    getAverageFirstHalfScore(team, "away", "allow") * 10,
                  ) / 10}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default TeamsPage;

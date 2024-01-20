import {
  AppBar,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  Pagination,
} from "@mui/material";
import {  useState } from "react";
import type { ExtendedGame, ExtendedTeam, GamesPageProps } from "~/types";
import { api } from "~/utils/api";
import { getAverageFirstHalfScore } from "~/utils/getAverageFirstHalfScore";

const today = new Date();

const GamesPage: React.FC<GamesPageProps> = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [season, setSeason] = useState<number | string>(2023);
  const [skip, setSkip] = useState<number>(0);

  const gamesQuery =
    api.games.getGamesByDate.useQuery({ date: selectedDate, limit: 10, skip: skip });

  if (gamesQuery.isLoading) {
    return <div>Loading...</div>;
  }


  const handleDateChange = (date: Date | null) => {
    if (!date) {
      return;
    }
    setSelectedDate(date);
    gamesQuery.refetch().catch(console.error);
  };

  const getPredictedScore = (game: unknown) => {
    let predictedScore = 0;
    let awayScore = 0;
    let homeScore = 0;
    const awayTeam = (game as ExtendedGame).awayTeam as ExtendedTeam;
    const homeTeam = (game as ExtendedGame).homeTeam as ExtendedTeam;
    awayScore = Math.round(
      ((getAverageFirstHalfScore(homeTeam, "home", "scores", season) +
        getAverageFirstHalfScore(awayTeam, "away", "allow", season)) /
        2) *
        10,
    ) / 10;
    homeScore = Math.round(
      ((getAverageFirstHalfScore(awayTeam, "away", "scores", season) +
        getAverageFirstHalfScore(homeTeam, "home", "allow", season)) /
        2) *
        10,
    ) / 10;
    predictedScore = Math.round((awayScore + homeScore) * 10) / 10;
    return predictedScore;
  }

  const handleSeasonChange = (event: SelectChangeEvent<string | number>) => {
    setSeason(event.target.value as number | string);
    gamesQuery.refetch().catch(console.error);
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
            <FormControl>
              <InputLabel id="season-select-label">Season</InputLabel>
              <Select
                labelId="season-select-label"
                id="season-select"
                value={season}
                onChange={handleSeasonChange}
              >
                <MenuItem value={2023}>2023</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
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
      {Array.isArray(gamesQuery.data?.games) && gamesQuery.data?.games?.length > 0 && (
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
              {gamesQuery.data?.games.map((game, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell>{game.awayTeam?.team}</TableCell>
                    <TableCell>{game.homeTeam?.team}</TableCell>
                    <TableCell>
                      {new Date(game.date).toLocaleString("en-US", {
                        timeZone: "America/Chicago",
                      })}
                    </TableCell>
                    <TableCell>{getPredictedScore(game)}</TableCell>

                    <TableCell>{game.estimatedHalfLine ?? " "}</TableCell>
                    <TableCell>{(game.awayPeriods as number[])[0] ?? " "}</TableCell>
                    <TableCell>{(game.homePeriods as number[])[0] ?? " "}</TableCell>
                    <TableCell>{game.actualHalfScore ?? " "}</TableCell>
                    <TableCell>{game.winLoss}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
      )}
      <Pagination
          count={Math.ceil((gamesQuery.data?.totalCount ?? 0) / 10)}
          variant="outlined"
          shape="rounded"
          onChange={(event, page) => {
            setSkip((page - 1) * 10);
          }}
        />
    </Container>
  );
};

export default GamesPage;

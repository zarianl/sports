import {
  AppBar,
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
import {  useState } from "react";
import type { GamesPageProps } from "~/types";
import { api } from "~/utils/api";

const today = new Date();

const GamesPage: React.FC<GamesPageProps> = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const gamesQuery =
    api.games.getGamesByDate.useQuery(selectedDate);

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
      {Array.isArray(gamesQuery.data) && gamesQuery.data.length > 0 && (
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
              {gamesQuery.data?.map((game, index) => {
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

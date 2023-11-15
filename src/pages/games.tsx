import { Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';
import axios, { type AxiosResponse } from 'axios';
import { type GetServerSideProps } from 'next';
import { type Game } from '@prisma/client';
import { getAverageFirstHalfScore } from '~/utils/getAverageFirstHalfScore';

const prisma = new PrismaClient();


interface TeamsPageProps {
    teams: TeamWithGames[],
    gamesProp: GameProps[]
}

interface TeamWithGames {
    id: number;
    team: string;
    location: string;
    conference: string;
    division: string;
    abbreviation?: string | null;
    awayGames: GameWithoutTimestamps[];
    homeGames: GameWithoutTimestamps[];
}

interface GameWithoutTimestamps {
    id: number;
    seasonType: string;
    awayPeriods: unknown;
    homePeriods: unknown;
}

interface GameProps {
    estimatedHalfLine: number;
    predictedHalfLine: number | null;
    actualHalfScore: number;
    overUnder: number;
    winLoss: string;
}

export const getServerSideProps: GetServerSideProps = async () => {
    let teams: TeamWithGames[] = await prisma.team.findMany({
        select: {
            id: true,
            team: true,
            mascot: true,
            location: true,
            conference: true,
            division: true,
            league: true,
            abbreviation: true,
            awayGames: {
                select: {
                    id: true,
                    seasonType: true,
                    awayPeriods: true,
                    homePeriods: true
                },
            },
            homeGames: {
                select: {
                    id: true,
                    seasonType: true,
                    awayPeriods: true,
                    homePeriods: true
                },
            },
        },
    });
    teams = teams.map(team => ({
        id: team.id,
        team: team.team,
        location: team.location,
        conference: team.conference,
        division: team.division,
        abbreviation: team.abbreviation,
        awayGames: team.awayGames.map(game => ({
            id: game.id,
            seasonType: game.seasonType,
            awayPeriods: game.awayPeriods,
            homePeriods: game.homePeriods,
        })),
        homeGames: team.homeGames.map(game => ({
            id: game.id,
            seasonType: game.seasonType,
            awayPeriods: game.awayPeriods,
            homePeriods: game.homePeriods,
        })),
    }));

    let games = await prisma.game.findMany();

    games = games.map((game: Game) => ({
        ...game,
        id: game.id,
        date: new Date(game.date).toISOString(),
        createdAt: new Date(game.createdAt).toISOString(),
        updatedAt: new Date(game.updatedAt).toISOString(),
        gameId: game.gameId,
        estimatedHalfLine: game.estimatedHalfLine,
        predictedHalfLine: game.predictedHalfScore ? game.predictedHalfScore : null,
        actualHalfScore: game.actualHalfScore,
        overUnder: game.overUnder,
        winLoss: game.winLoss,
    }));

    return {
        props: {
            teams,
            gamesProp: games
        },
    };
};

const GamesPage: React.FC<TeamsPageProps> = ({ teams, gamesProp }) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [games, setGames] = useState<Game[]>([]);
    const [wins, setWins] = useState(0)
    const [loss, setLoss] = useState(0)

    useEffect(() => {
        const winGames = gamesProp.filter(game => game.winLoss === "Win");
        setWins(winGames.length);
        const lossGames = gamesProp.filter(game => game.winLoss === "Loss");
        setLoss(lossGames.length);
    }, [gamesProp]);

    useEffect(() => {
        if (selectedDate) {
            const options = {
                method: 'GET',
                url: 'https://sportspage-feeds.p.rapidapi.com/games',
                params: {
                    league: 'NCAAB',
                    date: selectedDate.toISOString().split('T')[0]
                },
                headers: {
                    'X-RapidAPI-Key': 'e535d42c74msha27d666909c4fc1p19240bjsne0308eef1af3',
                    'X-RapidAPI-Host': 'sportspage-feeds.p.rapidapi.com'
                }
            };

            axios.request(options).then((response: AxiosResponse) => {
                console.log('response', response.data.results)
                const responseGames: Game[] = response.data.results.map((game: any) => ({
                    teams: {
                        away: {
                            team: game.teams.away.team
                        },
                        home: {
                            team: game.teams.home.team
                        }
                    },
                    schedule: {
                        date: game.schedule.date
                    },
                    ...(game.odds && game.odds.length > 0 ? {
                        odds: {
                            current: game.odds[0].total.current.total,
                            open: game.odds[0].total.open.total
                        }
                    } : {}),
                    scoreboard: game.scoreboard
                }))
                setGames(responseGames);
            }).catch((error) => {
                console.error(error);
            });
        }
    }, [selectedDate]);

    const handleDateChange = (date: Date | null) => {
        setSelectedDate(date);
    };


    return (
        <Container>
            <TextField
                id="date"
                label="Game Date"
                type="date"
                defaultValue={selectedDate}
                onChange={(event) => handleDateChange(new Date(event.target.value))}
                InputLabelProps={{
                    shrink: true,
                }}
            />
            Wins: {wins}
            Losses: {loss}
            Win Rate: {((loss / wins) * 100).toFixed(2)}%
            {Array.isArray(games) && games.length > 0 && (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Away Team</TableCell>
                                <TableCell>Home Team</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Away Average Score</TableCell>
                                <TableCell>Home Average Score</TableCell>
                                <TableCell>Predicted Score</TableCell>
                                <TableCell>Estimated Half Line</TableCell>
                                <TableCell>Away Periods</TableCell>
                                <TableCell>Home Periods</TableCell>
                                <TableCell>Actual Half Score</TableCell>
                                <TableCell>Win/Loss</TableCell>
                                <TableCell>Dif</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {games.sort((a, b) => a.teams.away.team.localeCompare(b.teams.away.team)).map((game, index) => {
                                const homeTeam = teams.find(t => t.team === game.teams.home.team);
                                const awayTeam = teams.find(t => t.team === game.teams.away.team);

                                let awayScore, homeScore, predictedScore = 0;
                                if (homeTeam && awayTeam) {
                                    awayScore = Math.round((
                                        getAverageFirstHalfScore(homeTeam, 'home', 'scores') +
                                        getAverageFirstHalfScore(awayTeam, 'away', 'allow')
                                    ) / 2 * 10) / 10;
                                    homeScore = Math.round((
                                        getAverageFirstHalfScore(homeTeam, 'away', 'scores') +
                                        getAverageFirstHalfScore(awayTeam, 'home', 'allow')
                                    ) / 2 * 10) / 10
                                    predictedScore = Math.round(((awayScore + homeScore)) * 10) / 10
                                }
                                console.log('Game', game)
                                let halfTimeScore = 0
                                const awayPeriodsScore = game.scoreboard?.score?.awayPeriods[0]
                                const homePeriodsScore = game.scoreboard?.score?.homePeriods[0]
                                halfTimeScore = awayPeriodsScore + homePeriodsScore
                                const predictedHalfLine = game.odds && game.odds.open ? Math.round(game.odds.open * 0.47 * 2) / 2 : null;
                                const overUnder = predictedScore < predictedHalfLine ? 'under' : 'over';
                                const winLoss = (predictedScore < predictedHalfLine && halfTimeScore > predictedHalfLine) || (predictedScore > predictedHalfLine && halfTimeScore < predictedHalfLine) ? 'Loss' : 'Win';
                                const dif = Math.round(Math.abs(predictedScore - predictedHalfLine))
                                if(!awayScore || !homeScore) return
                                const tableRowClass = `bg-${overUnder === 'under' ? 'red' : 'green'}-${Math.min(dif, 9) * 100}`;
                                return (
                                    <TableRow key={index} className={tableRowClass } >
                                        <TableCell>{game.teams.away.team}</TableCell>
                                        <TableCell>{game.teams.home.team}</TableCell>
                                        <TableCell>{new Date(game.schedule.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{awayScore}</TableCell>
                                        <TableCell>{homeScore}</TableCell>
                                        <TableCell>{predictedScore}</TableCell>


                                        <TableCell>{predictedHalfLine ?? " "}</TableCell>
                                        <TableCell>{game.scoreboard?.score.awayPeriods[0]}</TableCell>
                                        <TableCell>{game.scoreboard?.score.homePeriods[0]}</TableCell>
                                        <TableCell>{halfTimeScore}</TableCell>
                                        <TableCell>{winLoss}</TableCell>
                                        <TableCell>{dif}</TableCell>
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

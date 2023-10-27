import { Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { type GetServerSideProps } from 'next';

const prisma = new PrismaClient();

interface Game {
    teams: {
        away: {
            team: string
        },
        home: {
            team: string
        }
    }
    schedule: {
        date: string
    }
}

interface TeamsPageProps {
    teams: TeamWithGames[]
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

    return {
        props: {
            teams,
        },
    };
};

const GamesPage: React.FC<TeamsPageProps> = ({ teams }) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [games, setGames] = useState<Game[]>([]);

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

            axios.request(options).then((response) => {
                setGames(response.data.results.map((game: Game) => ({
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
                    }
                })));
            }).catch((error) => {
                console.error(error);
            });
        }
    }, [selectedDate]);

    const handleDateChange = (date: Date | null) => {
        setSelectedDate(date);
    };

    const getAverageFirstHalfScore = (team: TeamWithGames, homeOrAway: 'home' | 'away', scoresOrAllow: 'scores' | 'allow') => {
        let totalScore = 0;
        let totalGames = 0;

        try {
            team.awayGames.forEach(game => {
                if (scoresOrAllow === 'scores' && homeOrAway === 'away' && Array.isArray(game.awayPeriods) && game.awayPeriods.length > 0) {
                    totalScore += Number(game.awayPeriods[0]);
                    totalGames++;
                }
                if (scoresOrAllow === 'allow' && homeOrAway === 'home' && Array.isArray(game.homePeriods) && game.homePeriods.length > 0) {
                    totalScore += Number(game.homePeriods[0]);
                    totalGames++;
                }
            });

            team.homeGames.forEach(game => {
                if (scoresOrAllow === 'scores' && homeOrAway === 'home' && Array.isArray(game.homePeriods) && game.homePeriods.length > 0) {
                    totalScore += Number(game.homePeriods[0]);
                    totalGames++;
                }
                if (scoresOrAllow === 'allow' && homeOrAway === 'away' && Array.isArray(game.awayPeriods) && game.awayPeriods.length > 0) {
                    totalScore += Number(game.awayPeriods[0]);
                    totalGames++;
                }
            });
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Error calculating average first half score: ${error.message}`);
            } else {
                console.error(`Error calculating average first half score: $${String(error)}`);
            }
        }

        return totalGames > 0 ? totalScore / totalGames : 0;
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
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {games.map((game, index) => {
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
                                    predictedScore = Math.round(((awayScore + homeScore)/2)*10)/10
                                }

                                return (
                                    <TableRow key={index}>
                                        <TableCell>{game.teams.away.team}</TableCell>
                                        <TableCell>{game.teams.home.team}</TableCell>
                                        <TableCell>{new Date(game.schedule.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{awayScore}</TableCell>
                                        <TableCell>{homeScore}</TableCell>
                                        <TableCell>{predictedScore}</TableCell>
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

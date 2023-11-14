import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import axios from "axios";
import { db } from "~/server/db";
import { getAverageFirstHalfScore } from "~/utils/getAverageFirstHalfScore";

const GamesPage: React.FC<{ games: PrismaGame[] }> = ({ games }) => {
    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Season Type</TableCell>
                        <TableCell>Season</TableCell>
                        <TableCell>Game ID</TableCell>
                        <TableCell>Home Team</TableCell>
                        <TableCell>Home Team</TableCell>
                        <TableCell>Conference Game</TableCell>
                        <TableCell>Division Game</TableCell>
                        <TableCell>Neutral Site</TableCell>
                        <TableCell>Predicted Half Score</TableCell>
                        <TableCell>Actual Half Score</TableCell>
                        <TableCell>Estimated Half Line</TableCell>
                        <TableCell>Over Under</TableCell>
                        <TableCell>Win Loss</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {games.map((game: PrismaGame) => (
                        <TableRow key={game.gameId}>
                            <TableCell>{new Date(game.date).toLocaleDateString()}</TableCell>
                            <TableCell>{game.seasonType}</TableCell>
                            <TableCell>{game.season}</TableCell>
                            <TableCell>{game.gameId}</TableCell>
                            <TableCell>{game.homeTeam.team}</TableCell>
                            <TableCell>{game.awayTeam.team}</TableCell>
                            <TableCell>{game.conferenceGame ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{game.divisionGame ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{game.neutralSite ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{game.predictedHalfScore}</TableCell>
                            <TableCell>{game.actualHalfScore}</TableCell>
                            <TableCell>{game.estimatedHalfLine}</TableCell>
                            <TableCell>{game.overUnder}</TableCell>
                            <TableCell>{game.winLoss}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

interface Team {
    id: number;
    team: string;
    mascot: string;
    location: string;
    conference: string;
    division: string;
    league: string | null;
    abbreviation: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    awayGames: Game[];
    homeGames: Game[];
}

interface Odds {
    spread: {
        open: {
            away: number;
            home: number;
            awayOdds: number;
            homeOdds: number;
        };
        current: {
            away: number;
            home: number;
            awayOdds: number;
            homeOdds: number;
        };
    },
    moneyLine: {
        open: {
            awayOdds: number;
            homeOdds: number;
        };
        current: {
            awayOdds: number;
            homeOdds: number;
        };
    },
    total: {
        open: {
            total: number,
            overOdds: number,
            underOdds: number
        },
        current: {
            total: number,
            overOdds: number,
            underOdds: number
        }
    }

}

interface Game {
    schedule: {
        date: string;
        tbaTime: boolean;
    };
    summary: string;
    details: {
        league: string;
        seasonType: string;
        season: number;
        conferenceGame: boolean;
        divisionGame: boolean;
    };
    status: string;
    teams: {
        away: Team;
        home: Team;
    };
    lastUpdated: string;
    gameId: number;
    odds: Odds[];
    venue: {
        name: string;
        city: string;
        state: string;
        neutralSite: boolean;
    };
    scoreboard: {
        score: {
            away: number;
            home: number;
            awayPeriods: number[];
            homePeriods: number[];
        };
        currentPeriod: number;
        periodTimeRemaining: string;
    };
}

interface SportsPageFeedGamesResult {
    status: number;
    time: string;
    games: number;
    skip: number;
    results: Game[];
}

interface PrismaGame {
    date: Date | string;
    seasonType: string;
    season: number;
    gameId: number;
    conferenceGame: boolean;
    divisionGame: boolean;
    neutralSite: boolean;
    awayTeamId: number;
    homeTeamId: number;
    awayPeriods: number[];
    homePeriods: number[];
    homeTeam: Team,
    awayTeam: Team,
    predictedHalfScore: number;
    actualHalfScore: number;
    estimatedHalfLine: number;
    overUnder: string;
    winLoss: string;
}



export async function getServerSideProps() {
    let skip = 0;
    let games: PrismaGame[] = [];
    let response;
    const today = new Date().toISOString().split('T')[0];

    do {
        const options = {
            method: 'GET',
            url: 'https://sportspage-feeds.p.rapidapi.com/games',
            params: {
                league: 'NCAAB',
                date: today,
                skip: skip
            },
            headers: {
                'X-RapidAPI-Key': 'e535d42c74msha27d666909c4fc1p19240bjsne0308eef1af3',
                'X-RapidAPI-Host': 'sportspage-feeds.p.rapidapi.com'
            }
        };

        response = await axios.request<SportsPageFeedGamesResult>(options);
        const formattedGames: Promise<PrismaGame>[] = response.data.results.map(async (game: Game) => {
            let awayTeam = await db.team.findUnique({
                where: { team: game.teams.away.team },
                include: { homeGames: true, awayGames: true }
            }) ??
                await db.team.create({
                    data: {
                        team: game.teams.away.team,
                        mascot: game.teams.away.mascot,
                        location: game.teams.away.location,
                        conference: game.teams.away?.conference || "",
                        division: game.teams.away.division || "",
                        abbreviation: game.teams.away.abbreviation ?? ""
                    },
                    include: {
                        homeGames: true,
                        awayGames: true
                    }
                });
            let homeTeam = await db.team.findUnique({
                where: { team: game.teams.home.team },
                include: { homeGames: true, awayGames: true }
            }) ??
                await db.team.create({
                    data: {
                        team: game.teams.home.team,
                        mascot: game.teams.home.mascot,
                        location: game.teams.home.location,
                        conference: game.teams.home?.conference || "",
                        division: game.teams.home.division || "",
                        abbreviation: game.teams.home.abbreviation ?? ""
                    },
                    include: {
                        homeGames: true,
                        awayGames: true
                    }
                });
            let awayScore, homeScore, predictedHalfScore
            const formatGames = (team: Team) => {
                return {
                    ...team,
                    awayGames: team.awayGames.map((game) => ({
                        schedule: {
                            date: new Date(game.date).toISOString(),
                            tbaTime: false,
                        },
                        summary: "",
                        details: {
                            league: "",
                            seasonType: game.details.seasonType,
                            season: game.details.season,
                            conferenceGame: game.details.conferenceGame,
                            divisionGame: game.details.divisionGame,
                        },
                        status: "",
                        teams: {
                            away: team,
                            home: team,
                        },
                        lastUpdated: "",
                        gameId: game.gameId,
                        odds: [],
                        venue: {
                            name: "",
                            city: "",
                            state: "",
                            neutralSite: game.venue.neutralSite,
                        },
                        scoreboard: {
                            score: {
                                away: 0,
                                home: 0,
                                awayPeriods: game.scoreboard.score.awayPeriods,
                                homePeriods: game.scoreboard.score.homePeriods,
                            },
                            currentPeriod: 0,
                            periodTimeRemaining: "",
                        },
                    })),
                    homeGames: team.homeGames.map((game) => ({
                        // similar mapping as above
                    }))
                }
            }
            awayTeam = formatGames(awayTeam);
            homeTeam = formatGames(homeTeam);
            if (homeTeam && awayTeam) {
                awayScore = Math.round((
                    getAverageFirstHalfScore(homeTeam, 'home', 'scores') +
                    getAverageFirstHalfScore(awayTeam, 'away', 'allow')
                ) / 2 * 10) / 10;
                homeScore = Math.round((
                    getAverageFirstHalfScore(homeTeam, 'away', 'scores') +
                    getAverageFirstHalfScore(awayTeam, 'home', 'allow')
                ) / 2 * 10) / 10
                predictedHalfScore = Math.round(((awayScore + homeScore)) * 10) / 10
            }

            let estimatedHalfLine;
            try {
                estimatedHalfLine = game.odds?.[0]?.total?.open.total ? Math.round(game.odds[0].total.open.total * 0.46 * 2) / 2 : null;
            } catch (error) {
                estimatedHalfLine = null;
            }
            // if (estimatedHalfLine !== null && isNaN(estimatedHalfLine)) {
            //     estimatedHalfLine = 999;
            // }

            const actualHalfScore = (game.scoreboard?.score?.awayPeriods?.[0] ?? 0) + (game.scoreboard?.score?.homePeriods?.[0] ?? 0) || null;
            const overUnder = estimatedHalfLine === null ? null : (predictedHalfScore && predictedHalfScore < estimatedHalfLine ? "Under" : "Over");

            const winLoss = estimatedHalfLine === null || actualHalfScore === null || !predictedHalfScore || !overUnder ? null : 
                (overUnder === "Under" && predictedHalfScore < actualHalfScore) ? "Win" :
                (overUnder === "Over" && predictedHalfScore > actualHalfScore) ? "Win" : "Loss";



            return {
                date: new Date(game.schedule.date).toISOString(),
                seasonType: game.details.seasonType,
                season: game.details.season,
                gameId: game.gameId,
                conferenceGame: game.details.conferenceGame,
                divisionGame: game.details.divisionGame,
                neutralSite: game.venue.neutralSite,
                awayTeamId: awayTeam.id,
                homeTeamId: homeTeam.id,
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                awayPeriods: game.scoreboard?.score.awayPeriods || null,
                homePeriods: game.scoreboard?.score.homePeriods || null,
                predictedHalfScore: predictedHalfScore ?? 0,
                actualHalfScore: actualHalfScore,
                estimatedHalfLine: estimatedHalfLine,
                overUnder: overUnder,
                winLoss: winLoss
            };
        });
        const resolvedGames = await Promise.all(formattedGames);
        games = [...games, ...resolvedGames];
        skip += 100;
    } while (response.data.games > 0);

    return {
        props: {
            games
        }
    };
}


export default GamesPage
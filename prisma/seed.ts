import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { getAverageFirstHalfScore } from "~/utils/getAverageFirstHalfScore";

const prisma = new PrismaClient();

const options = {
  method: 'GET',
  url: 'https://sportspage-feeds.p.rapidapi.com/games',
  params: {
    odds: 'total',
    status: 'final',
    league: 'NCAAB',
    date: '2022-01-01,2022-12-31',
    skip: 0
  },
  headers: {
    'X-RapidAPI-Key': 'e535d42c74msha27d666909c4fc1p19240bjsne0308eef1af3',
    'X-RapidAPI-Host': 'sportspage-feeds.p.rapidapi.com'
  }
};

interface GameResponse {
  status: number;
  time: string;
  games: number;
  skip: number;
  results: Array<{
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
      away: {
        team: string;
        location: string;
        mascot: string;
        abbreviation: string;
        conference: string;
        division: string;
      };
      home: {
        team: string;
        location: string;
        mascot: string;
        abbreviation: string;
        conference: string;
        division: string;
      };
    };
    lastUpdated: string;
    gameId: number;
    odds: Array<{
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
      };
      moneyline: {
        open: {
          awayOdds: number;
          homeOdds: number;
        };
        current: {
          awayOdds: number;
          homeOdds: number;
        };
      };
      total: {
        open: {
          total: number;
          overOdds: number;
          underOdds: number;
        };
        current: {
          total: number;
          overOdds: number;
          underOdds: number;
        };
      };
      openDate: string;
      lastUpdated: string;
    }>;
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
  }>;
}

async function seedGames() {
  await prisma.game.deleteMany({})
  let skip = 0;
  let results = [];
  do {
    options.params.skip = skip;
    const { data } = await axios.request<GameResponse>(options);
    results = data.results;
    console.log(results);

    for (const game of results) {
      let awayTeam = await prisma.team.findUnique({
        where: { team: game.teams.away.team },
        include: { awayGames: true, homeGames: true },
      });
      if (!awayTeam) {
        awayTeam = await prisma.team.create({
          data: { 
            team: game.teams.away.team,
            mascot: game.teams.away.mascot,
            location: game.teams.away.location,
            conference: game.teams.away.conference,
            division: game.teams.away.division, 
          },
          include: { awayGames: true, homeGames: true },
        });
      }
      let homeTeam = await prisma.team.findUnique({
        where: { team: game.teams.home.team },
        include: { homeGames: true, awayGames: true },
      });
      if (!homeTeam) {
        homeTeam = await prisma.team.create({
          data: { 
            team: game.teams.home.team,
            mascot: game.teams.home.mascot,
            location: game.teams.home.location,
            conference: game.teams.home.conference,
            division: game.teams.home.division,  
          },
          include: { awayGames: true, homeGames: true },
        });
      }

      let awayScore, homeScore, predictedHalfLine = 0;
      if (homeTeam && awayTeam) {
        awayScore = Math.round((
          getAverageFirstHalfScore(homeTeam, 'home', 'scores') +
          getAverageFirstHalfScore(awayTeam, 'away', 'allow')
        ) / 2 * 10) / 10;
        homeScore = Math.round((
          getAverageFirstHalfScore(homeTeam, 'away', 'scores') +
          getAverageFirstHalfScore(awayTeam, 'home', 'allow')
        ) / 2 * 10) / 10
        predictedHalfLine = Math.round(((awayScore + homeScore)) * 10) / 10
      }
      const actualHalfLine = game.scoreboard?.score.awayPeriods?.[0] !== undefined && game.scoreboard?.score.homePeriods?.[0] !== undefined ?
        (game.scoreboard.score.awayPeriods[0] + game.scoreboard.score.homePeriods[0]) : null;


      const estimatedHalfLine = game.odds?.[0]?.total?.open?.total ? Math.round(game.odds[0].total.open.total * 0.5 * 2) / 2 : null;

      const overUnder = estimatedHalfLine !== null ? (predictedHalfLine < estimatedHalfLine ? "Under" : "Over") : null;

      const winLoss = actualHalfLine === null || estimatedHalfLine === null ? null :
        (actualHalfLine > estimatedHalfLine && overUnder === "Over") || 
        (actualHalfLine < estimatedHalfLine && overUnder === "Under") ? "Win" : "Loss";



      if (awayTeam && homeTeam) {
        const existingGame = await prisma.game.findUnique({
          where: { gameId: game.gameId },
        });

        if (existingGame) {
          await prisma.game.update({
            where: { gameId: game.gameId },
            data: {
              date: new Date(game.schedule.date),
              seasonType: game.details.seasonType,
              season: game.details.season,
              conferenceGame: game.details.conferenceGame,
              divisionGame: game.details.divisionGame,
              neutralSite: game.venue.neutralSite || false,
              awayTeamId: awayTeam.id,
              homeTeamId: homeTeam.id,
              awayPeriods: game.scoreboard.score.awayPeriods,
              homePeriods: game.scoreboard.score.homePeriods,
              totalOpenTotal: game.scoreboard.score.away + game.scoreboard.score.home,
              predictedHalfScore: predictedHalfLine,
              estimatedHalfLine: estimatedHalfLine,
              actualHalfScore: actualHalfLine,
              overUnder: overUnder,
              winLoss: winLoss
            },
          });
        } else {
          await prisma.game.create({
            data: {
              date: new Date(game.schedule.date),
              seasonType: game.details.seasonType,
              season: game.details.season,
              gameId: game.gameId,
              conferenceGame: game.details.conferenceGame,
              divisionGame: game.details.divisionGame,
              neutralSite: game.venue.neutralSite || false,
              awayTeamId: awayTeam.id,
              homeTeamId: homeTeam.id,
              awayPeriods: game.scoreboard.score.awayPeriods,
              homePeriods: game.scoreboard.score.homePeriods,
              totalOpenTotal: game.scoreboard.score.away + game.scoreboard.score.home,
              predictedHalfScore: predictedHalfLine,
              estimatedHalfLine: estimatedHalfLine,
              actualHalfScore: actualHalfLine,
              overUnder: overUnder,
              winLoss: winLoss
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
    prisma.$disconnect()
      .then(() => console.log('Disconnected from Prisma'))
      .catch((e) => console.error('Error disconnecting from Prisma:', e));
  });


// const teamOptions = {
//   method: 'GET',
//   url: 'https://sportspage-feeds.p.rapidapi.com/teams',
//   params: { league: 'ncaab' },
//   headers: {
//     'X-RapidAPI-Key': 'e535d42c74msha27d666909c4fc1p19240bjsne0308eef1af3',
//     'X-RapidAPI-Host': 'sportspage-feeds.p.rapidapi.com'
//   }
// };

// interface ApiResponse {
//   results: Array<{
//     team: string;
//     mascot: string;
//     location: string;
//     conference: string;
//     division: string;
//     league: string;
//     abbreviation: string;
//   }>;
// }

// async function main() {
//   const { data } = await axios.request<ApiResponse>(teamOptions);

//   for (const item of data.results) {
//     await prisma.team.create({
//       data: {
//         team: item.team,
//         mascot: item.mascot,
//         location: item.location,
//         conference: item.conference,
//         division: item.division,
//         league: item.league,
//         abbreviation: item.abbreviation,
//       },
//     });
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(() => {
//     prisma.$disconnect()
//       .then(() => console.log('Disconnected from Prisma'))
//       .catch((e) => console.error('Error disconnecting from Prisma:', e));
//   });
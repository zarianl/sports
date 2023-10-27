import { PrismaClient } from "@prisma/client";
import axios from "axios";

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
  results: Array<{
    schedule: {
      date: string;
    };
    details: {
      league: string;
      seasonType: string;
      season: number;
      conferenceGame: boolean;
      divisionGame: boolean;
    },
    status: string;
    teams: {
      away: {
        team: string;
      };
      home: {
        team: string;
      };
    };
    venue: {
      neutralSite: boolean;
    };
    scoreboard: {
      score: {
        away: number;
        home: number;
        awayPeriods: number[];
        homePeriods: number[];
      };

    };

  }>;
}

async function seedGames() {
  let skip = 0;
  let results = [];
  do {
    options.params.skip = skip;
    const { data } = await axios.request<GameResponse>(options);
    results = data.results;
    console.log(results);

    for (const game of results) {
      const awayTeam = await prisma.team.findUnique({
        where: { team: game.teams.away.team },
      });
      const homeTeam = await prisma.team.findUnique({
        where: { team: game.teams.home.team },
      });

      if (awayTeam && homeTeam) {
        await prisma.game.create({
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
          },
        });
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
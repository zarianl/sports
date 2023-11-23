import { type Game, type Team } from "@prisma/client";

export interface SportspageGameFeed {
  data: {
    status: number;
    time: string;
    games: number;
    skip: number;
    results: SportspageGame[];
  };
}

export interface SportspageGame {
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
  odds: {
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
  }[];
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

export interface TeamsPageProps {
  teams: TeamWithGames[];
  dbGames: ExtendedGame[];
}

export interface GamesPageProps {
  dbGames: ExtendedGame[];
}

export interface ExtendedTeam extends Team {
  awayGames: Game[] | SportspageGameData[];
  homeGames: Game[] | SportspageGameData[];
}

export interface ExtendedGame extends Game {
  awayTeam: Team;
  homeTeam: Team;
}

export interface TeamWithGames {
  id: number;
  team: string;
  location: string;
  conference: string;
  division?: string | null;
  abbreviation?: string | null;
  awayGames: SportspageGameData[];
  homeGames: SportspageGameData[];
  createdAt: string;
  updatedAt: string;
}



export interface SportspageGameData {
  id: number;
  seasonType: string;
  awayPeriods: number[];
  homePeriods: number[];
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameProps {
  estimatedHalfLine: number;
  predictedHalfLine: number | null;
  actualHalfScore: number;
  overUnder: number;
  winLoss: string;
}

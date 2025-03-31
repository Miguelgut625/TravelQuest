export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
}

export interface JourneyMission {
  id: string;
  completed: boolean;
  cityName: string;
  start_date: string;
  end_date: string;
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    points: number;
  };
}

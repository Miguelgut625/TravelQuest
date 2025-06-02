export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
}

export interface JourneyMission {
  id: string;
  challengeId: string;
  completed: boolean;
  title: string;
  description: string;
  points: number;
  cityName: string;
  correctedCityName?: string;
  challenge: Challenge;
} 
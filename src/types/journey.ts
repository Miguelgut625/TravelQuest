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
  userId: string; // ✅ Añadido
  cityName: string;
  start_date: string;
  end_date: string;
  challenge: Challenge; // ✅ Usar el tipo ya definido
}

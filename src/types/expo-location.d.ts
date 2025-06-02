// Definiciones de tipos para expo-location
declare module 'expo-location' {
  export enum Accuracy {
    Lowest = 1,
    Low = 2,
    Balanced = 3,
    High = 4,
    Highest = 5,
    BestForNavigation = 6
  }

  export interface LocationObject {
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number | null;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  }

  export interface LocationPermissionResponse {
    status: string;
    granted: boolean;
    canAskAgain: boolean;
  }

  export function requestForegroundPermissionsAsync(): Promise<LocationPermissionResponse>;
  export function getLastKnownPositionAsync(): Promise<LocationObject | null>;
  export function getCurrentPositionAsync(options?: any): Promise<LocationObject>;
  export function watchPositionAsync(
    options: any,
    callback: (location: LocationObject) => void
  ): Promise<{ remove: () => void }>;
} 
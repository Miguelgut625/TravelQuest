declare module 'expo-location' {
  export interface Location {
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  }

  export interface PermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
  }

  export function requestForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function getCurrentPositionAsync(options?: {}): Promise<Location>;
} 
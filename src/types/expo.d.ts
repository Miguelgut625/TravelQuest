// Declaraciones de tipo para los módulos de Expo

declare module '@expo/vector-icons' {
  import React from 'react';
  
  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }

  export class Ionicons extends React.Component<IconProps> {}
  export class FontAwesome extends React.Component<IconProps> {}
  export class MaterialIcons extends React.Component<IconProps> {}
  export class MaterialCommunityIcons extends React.Component<IconProps> {}
  export class AntDesign extends React.Component<IconProps> {}
  export class Entypo extends React.Component<IconProps> {}
  export class EvilIcons extends React.Component<IconProps> {}
  export class Feather extends React.Component<IconProps> {}
  export class FontAwesome5 extends React.Component<IconProps> {}
  export class Foundation extends React.Component<IconProps> {}
  export class Octicons extends React.Component<IconProps> {}
  export class SimpleLineIcons extends React.Component<IconProps> {}
  export class Zocial extends React.Component<IconProps> {}
}

declare module 'expo-location' {
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

  export interface LocationOptions {
    accuracy?: LocationAccuracy;
    timeInterval?: number;
    distanceInterval?: number;
  }

  export enum LocationAccuracy {
    Lowest = 1,
    Low = 2,
    Balanced = 3,
    High = 4,
    Highest = 5,
    BestForNavigation = 6,
  }

  export function requestForegroundPermissionsAsync(): Promise<{
    status: string;
    granted: boolean;
  }>;

  export function getCurrentPositionAsync(options?: LocationOptions): Promise<LocationObject>;
}

declare module 'expo-image-picker' {
  export interface ImagePickerOptions {
    mediaTypes?: MediaTypeOptions;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }

  export enum MediaTypeOptions {
    All = 'All',
    Images = 'Images',
    Videos = 'Videos',
  }

  export interface ImagePickerResult {
    cancelled: boolean;
    uri?: string;
    width?: number;
    height?: number;
    type?: string;
    base64?: string;
  }

  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export function requestCameraPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
}

// Definiciones de tipos para expo
declare module '@expo/vector-icons' {
  export const Ionicons: any;
  export const FontAwesome: any;
  export const MaterialIcons: any;
  export const MaterialCommunityIcons: any;
}

declare global {
  var __DEV__: boolean;
}

declare module 'expo' {
  export function registerRootComponent(component: React.ComponentType<any>): void;
}

declare module '@expo/vector-icons' {
  export const Ionicons: any;
  export const MaterialIcons: any;
  export const FontAwesome: any;
  export const Feather: any;
} 
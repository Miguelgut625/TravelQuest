// Definiciones de tipos para react-navigation
declare module '@react-navigation/native' {
  export function useNavigation(): any;
  export function useRoute(): any;
  export type RouteProp<T, K extends keyof T> = any;
}

declare module '@react-navigation/native-stack' {
  export type NativeStackNavigationProp<T, K extends keyof T = keyof T> = any;
} 
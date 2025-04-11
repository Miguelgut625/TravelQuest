// Definiciones de tipos para react-navigation
declare module '@react-navigation/native' {
  export function useNavigation<T = any>(): T;
  export function useRoute<T = any>(): T;
  export type NavigationProp<T> = any;
  export type RouteProp<T, K extends keyof T = keyof T> = any;
  export function useIsFocused(): boolean;
  export function useFocusEffect(effect: React.EffectCallback): void;
}

declare module '@react-navigation/native-stack' {
  export type NativeStackNavigationProp<T, K extends keyof T = keyof T> = any;
  export function createNativeStackNavigator(): any;
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator(): any;
} 
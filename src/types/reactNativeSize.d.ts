// Definiciones extendidas para React Native
declare module 'react-native' {
  import * as React from 'react';

  // ActivityIndicator
  export interface ActivityIndicatorProps {
    size?: number | 'small' | 'large';
    color?: string;
    animating?: boolean;
    hidesWhenStopped?: boolean;
    style?: any;
  }
  
  // Alert
  export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }
  
  export interface AlertOptions {
    cancelable?: boolean;
    onDismiss?: () => void;
  }
  
  export interface AlertStatic {
    alert: (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => void;
  }
  
  export const Alert: AlertStatic;
  
  // RefreshControl
  export interface RefreshControlProps {
    refreshing: boolean;
    onRefresh?: () => void;
    tintColor?: string;
    title?: string;
    titleColor?: string;
    colors?: string[];
    progressBackgroundColor?: string;
    size?: number;
    progressViewOffset?: number;
    style?: any;
  }
  
  export class RefreshControl extends React.Component<RefreshControlProps> {
    render(): JSX.Element;
  }

  // TouchableOpacity
  export interface TouchableOpacityProps {
    activeOpacity?: number;
    style?: any;
    onPress?: () => void;
    onLongPress?: () => void;
    disabled?: boolean;
  }
  
  export class TouchableOpacity extends React.Component<TouchableOpacityProps> {
    render(): JSX.Element;
  }

  // FlatList
  export interface FlatListProps<ItemT> {
    data: ReadonlyArray<ItemT>;
    renderItem: (info: { item: ItemT; index: number }) => React.ReactElement | null;
    keyExtractor?: (item: ItemT, index: number) => string;
    refreshControl?: React.ReactElement;
    style?: any;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    numColumns?: number;
    onEndReached?: () => void;
    onEndReachedThreshold?: number;
  }
  
  export class FlatList<ItemT = any> extends React.Component<FlatListProps<ItemT>> {
    render(): JSX.Element;
  }
} 
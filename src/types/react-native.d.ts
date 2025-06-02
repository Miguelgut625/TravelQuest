import 'react-native';

declare module 'react-native' {
  export interface ViewProps {
    style?: any;
    children?: React.ReactNode;
  }

  export interface TextProps {
    style?: any;
    children?: React.ReactNode;
  }

  export interface TextInputProps {
    style?: any;
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
  }

  export interface TouchableOpacityProps {
    style?: any;
    onPress?: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }

  export interface ActivityIndicatorProps {
    size?: 'small' | 'large' | number;
    color?: string;
  }

  export interface ModalProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    children?: React.ReactNode;
  }

  export const View: any;
  export const Text: any;
  export const StyleSheet: any;
  export const TextInput: any;
  export const TouchableOpacity: any;
  export const ActivityIndicator: any;
  export const Modal: any;
  export const Platform: {
    OS: 'ios' | 'android' | 'web';
    select: <T extends Record<string, any>>(config: T) => any;
  };
  export const Dimensions: {
    get: (dimension: 'window' | 'screen') => { width: number; height: number };
  };
  export const FlatList: any;
  export const ScrollView: any;
  export const KeyboardAvoidingView: any;
  export const Image: any;
  export const SafeAreaView: any;
  export const StatusBar: any;
  
  export function useWindowDimensions(): { width: number; height: number };
} 
declare module '@expo/vector-icons' {
  import { ComponentClass } from 'react';
  
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }
  
  export const AntDesign: ComponentClass<IconProps>;
  export const Entypo: ComponentClass<IconProps>;
  export const EvilIcons: ComponentClass<IconProps>;
  export const Feather: ComponentClass<IconProps>;
  export const FontAwesome: ComponentClass<IconProps>;
  export const FontAwesome5: ComponentClass<IconProps>;
  export const Fontisto: ComponentClass<IconProps>;
  export const Foundation: ComponentClass<IconProps>;
  export const Ionicons: ComponentClass<IconProps>;
  export const MaterialCommunityIcons: ComponentClass<IconProps>;
  export const MaterialIcons: ComponentClass<IconProps>;
  export const Octicons: ComponentClass<IconProps>;
  export const SimpleLineIcons: ComponentClass<IconProps>;
  export const Zocial: ComponentClass<IconProps>;
} 
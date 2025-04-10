// Definiciones de tipos para react-redux
declare module 'react-redux' {
  export function useSelector<T, U>(selector: (state: T) => U): U;
  export function useDispatch(): any;
  export const Provider: any;
} 
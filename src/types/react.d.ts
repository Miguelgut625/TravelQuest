// Extend React module
import 'react';

// Definiciones de tipos para React
declare module 'react' {
  // Interfaces básicas
  interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }

  interface ReactNode {
    // Vacío intencionalmente
  }

  // Tipos básicos
  type Key = string | number;
  type JSXElementConstructor<P> = (props: P) => ReactElement<any, any> | null;
  type ReactChild = ReactElement | string | number;
  type ReactFragment = {} | ReactNodeArray;
  type ReactNodeArray = Array<ReactNode>;
  
  // Hooks principales
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useRef<T>(initialValue: T | null): { current: T | null };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any>): T;
  export function useContext<T>(context: React.Context<T>): T;
  export function useReducer<R extends Reducer<any, any>, I>(
    reducer: R,
    initialArg: I,
    init?: (arg: I) => ReducerState<R>
  ): [ReducerState<R>, Dispatch<ReducerAction<R>>];
  
  // Tipos para Reducer
  type Reducer<S, A> = (prevState: S, action: A) => S;
  type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
  type Dispatch<A> = (value: A) => void;
  
  // Componentes funcionales
  type FC<P = {}> = FunctionComponent<P>;
  interface FunctionComponent<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement<any, any> | null;
  }
  
  // Context
  interface Context<T> {
    Provider: Provider<T>;
    Consumer: Consumer<T>;
    displayName?: string;
  }
  type Provider<T> = FC<{ value: T; children?: ReactNode }>;
  type Consumer<T> = FC<{ children: (value: T) => ReactNode }>;
  export function createContext<T>(defaultValue: T): Context<T>;
}

// Tipos globales para JSX
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass { render(): React.ReactNode; }
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
  }
}

export = React;
export as namespace React; 
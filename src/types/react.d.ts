// Extend React module
import 'react';

// Definiciones de tipos para React
import * as React from 'react';

declare global {
  namespace React {
    interface ReactNode {}
    interface FC<P = {}> {}
  }
}

declare module 'react' {
  export type ReactNode = React.ReactNode;
  export type FC<P = {}> = React.FC<P>;
  // Re-export all React hooks
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any>): T;
  export function useContext<T>(context: React.Context<T>): T;
}

declare namespace React {
  type ReactNode = 
    | React.Element
    | string
    | number
    | {}
    | boolean
    | null
    | undefined;

  interface Element {}

  type FC<P = {}> = FunctionComponent<P>;

  interface FunctionComponent<P = {}> {
    (props: P): React.ReactNode | null;
  }
}

export = React;
export as namespace React; 
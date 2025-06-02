import React from 'react';

// Arreglos para hooks de React
import 'react';

// Proporcionar definiciones alternativas para los hooks de React
declare module 'react' {
  // Hooks principales de React
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useRef<T>(initialValue: T | null): { current: T | null };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any>): T;
  export function useContext<T>(context: React.Context<T>): T;
  
  // Hook para gestionar el estado con reducers
  export function useReducer<R extends React.Reducer<any, any>, I>(
    reducer: R,
    initialArg: I,
    init?: (arg: I) => React.ReducerState<R>
  ): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];
  
  // Otros hooks
  export function useLayoutEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useImperativeHandle<T, R extends T>(
    ref: React.Ref<T>,
    init: () => R,
    deps?: ReadonlyArray<any>
  ): void;
} 
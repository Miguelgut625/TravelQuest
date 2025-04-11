// Definiciones de tipos para react-redux
declare module 'react-redux' {
  import * as React from 'react';
  
  // Hooks principales
  export function useSelector<TState = any, TSelected = unknown>(
    selector: (state: TState) => TSelected,
    equalityFn?: (left: TSelected, right: TSelected) => boolean
  ): TSelected;
  
  export function useDispatch<TDispatch = any>(): TDispatch;
  
  // Componente Provider
  export interface ProviderProps<A = any> {
    store: A;
    context?: React.Context<A>;
    children: React.ReactNode;
  }
  
  export const Provider: React.ComponentType<ProviderProps>;
  
  // Otras utilidades
  export function connect<TStateProps = {}, TDispatchProps = {}, TOwnProps = {}, TMergedProps = {}>(
    mapStateToProps?: (state: any, ownProps: TOwnProps) => TStateProps,
    mapDispatchToProps?: (dispatch: any, ownProps: TOwnProps) => TDispatchProps
  ): (
    component: React.ComponentType<TMergedProps>
  ) => React.ComponentType<TOwnProps>;
} 
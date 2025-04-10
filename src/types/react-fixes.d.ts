import React from 'react';

declare module 'react' {
  export = React;
  export as namespace React;
  
  // Añadir los hooks de React que faltan
  export const useState: typeof React.useState;
  export const useEffect: typeof React.useEffect;
  export const useRef: typeof React.useRef;
  export const useCallback: typeof React.useCallback;
  export const useMemo: typeof React.useMemo;
  export const useContext: typeof React.useContext;
} 
import 'react-native-webview';

declare module 'react-native-webview' {
  import * as React from 'react';
  
  export interface WebViewProps {
    source?: { uri: string } | { html: string };
    originWhitelist?: string[];
    onLoadEnd?: () => void;
    onError?: (event: any) => void;
    onMessage?: (event: any) => void;
    onLoadStart?: (event: any) => void;
    onLoad?: (event: any) => void;
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    style?: any;
    injectedJavaScript?: string;
    injectedJavaScriptBeforeContentLoaded?: string;
    scrollEnabled?: boolean;
    bounces?: boolean;
    decelerationRate?: 'normal' | 'fast' | number;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    directionalLockEnabled?: boolean;
    useWebKit?: boolean;
    userAgent?: string;
    cacheEnabled?: boolean;
    allowsInlineMediaPlayback?: boolean;
    startInLoadingState?: boolean;
    scalesPageToFit?: boolean;
    allowFileAccess?: boolean;
    geolocationEnabled?: boolean;
    allowsBackForwardNavigationGestures?: boolean;
    allowsLinkPreview?: boolean;
    renderLoading?: () => React.ReactElement;
    renderError?: (
      errorDomain: string | undefined,
      errorCode: number,
      errorDesc: string
    ) => React.ReactElement;
  }
  
  export class WebView extends React.Component<WebViewProps> {
    reload: () => void;
    stopLoading: () => void;
    goBack: () => void;
    goForward: () => void;
    injectJavaScript: (script: string) => void;
  }
} 
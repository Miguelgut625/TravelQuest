import 'react-native-webview';

declare module 'react-native-webview' {
  import { Component } from 'react';
  
  export interface WebViewProps {
    source?: { uri: string } | { html: string };
    style?: any;
    javaScriptEnabled?: boolean;
    onMessage?: (event: any) => void;
    onLoadEnd?: () => void;
    onLoadStart?: () => void;
    onError?: (event: any) => void;
    originWhitelist?: string[];
    startInLoadingState?: boolean;
    [key: string]: any;
  }
  
  export default class WebView extends Component<WebViewProps> {}
} 
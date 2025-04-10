import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface SimpleWebViewProps {
  style?: any;
  html?: string;
  source?: { uri: string } | { html: string };
  onError?: (error: string) => void;
}

// Cambiando la exportación a una constante con nombre (named export)
export const SimpleWebView = (props: SimpleWebViewProps) => {
  const { style, html, source, onError } = props;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Contenido HTML por defecto si no se proporciona contenido
  const defaultHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Simple Web View</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f0f0f0;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          .container {
            text-align: center;
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            max-width: 80%;
          }
          h1 {
            color: #005F9E;
          }
          p {
            line-height: 1.6;
          }
          button {
            background-color: #005F9E;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 20px;
            cursor: pointer;
          }
          button:hover {
            background-color: #004C7F;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Vista Web Simple</h1>
          <p>Esta es una vista web sencilla que funciona como respaldo.</p>
          <p>Se ha cargado correctamente.</p>
          <button id="changeColorBtn">Cambiar Color</button>
        </div>
        
        <script>
          // Script simple para probar interactividad
          document.getElementById('changeColorBtn').addEventListener('click', function() {
            const colors = ['#005F9E', '#4CAF50', '#FF5722', '#9C27B0', '#FF9800'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.querySelector('h1').style.color = randomColor;
          });
        </script>
      </body>
    </html>
  `;

  // Determinar el contenido HTML a mostrar
  const htmlContent = html || (source && 'html' in source ? source.html : defaultHtml);

  // Manejar errores de carga
  const handleError = (err: any) => {
    const errorMessage = typeof err === 'string' ? err : 'Error al cargar contenido web';
    setError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onError={(e) => handleError(e)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  }
}); 
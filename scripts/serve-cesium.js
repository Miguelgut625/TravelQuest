const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Permitir solicitudes CORS
app.use(cors());

// Servir archivos estáticos de Cesium
app.use('/cesium', express.static(path.join(__dirname, '../node_modules/cesium/Build/Cesium')));

// Ruta principal para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor de recursos para Cesium funcionando correctamente!');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Cesium iniciado en http://localhost:${PORT}/cesium`);
  console.log(`Para usar en WebView, actualiza la URL en GlobeView.tsx a http://localhost:${PORT}/cesium/Cesium.js`);
}); 
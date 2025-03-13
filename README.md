# TravelQuest 🌍✨

TravelQuest es una aplicación móvil que transforma la exploración de ciudades en una aventura emocionante. Los usuarios pueden descubrir lugares interesantes a través de misiones personalizadas basadas en la historia, cultura y curiosidades de cada ciudad.

## Características principales 🎯

- **Exploración guiada**: Misiones personalizadas basadas en la ciudad y el tiempo disponible
- **Sistema de puntos**: Gana puntos completando misiones y desbloqueando logros
- **Diario de viaje digital**: Guarda fotos y notas organizadas por ciudad
- **Perfil personalizado**: Seguimiento de progreso y estadísticas
- **Mapas interactivos**: Visualización de misiones y lugares de interés

## Tecnologías utilizadas 🛠️

- **Frontend**:
  - React Native con Expo
  - TypeScript
  - Redux Toolkit para gestión de estado
  - TailwindCSS para estilos
  - React Navigation para la navegación

- **Backend**:
  - Node.js
  - Python
  - Supabase para base de datos y autenticación
  - Supabase Storage para almacenamiento de imágenes

- **APIs**:
  - Google Maps API
  - OpenAI ChatGPT API

## Requisitos previos 📋

- Node.js (versión 14 o superior)
- npm o yarn
- Expo CLI
- Cuenta en Supabase
- Claves de API necesarias (Google Maps, OpenAI)

## Instalación 🚀

1. Clona el repositorio:
\`\`\`bash
git clone https://github.com/tuusuario/TravelQuest.git
cd TravelQuest
\`\`\`

2. Instala las dependencias:
\`\`\`bash
npm install
\`\`\`

3. Configura las variables de entorno:
Crea un archivo .env en la raíz del proyecto y añade:
\`\`\`
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps
OPENAI_API_KEY=tu_clave_de_openai
\`\`\`

4. Inicia la aplicación:
\`\`\`bash
npm start
\`\`\`

## Estructura del proyecto 📁

\`\`\`
TravelQuest/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── features/       # Redux slices y store
│   ├── hooks/         # Custom hooks
│   ├── navigation/    # Configuración de navegación
│   ├── screens/       # Pantallas de la aplicación
│   ├── services/      # Servicios de API
│   ├── types/        # Definiciones de tipos
│   └── utils/        # Utilidades y helpers
├── assets/           # Imágenes y recursos
└── ...
\`\`\`

## Contribución 🤝

1. Haz un Fork del proyecto
2. Crea una rama para tu feature (\`git checkout -b feature/AmazingFeature\`)
3. Haz commit de tus cambios (\`git commit -m 'Add some AmazingFeature'\`)
4. Push a la rama (\`git push origin feature/AmazingFeature\`)
5. Abre un Pull Request

## Licencia 📄

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE.md](LICENSE.md) para detalles

## Contacto 📧

Tu Nombre - [@tutwitter](https://twitter.com/tutwitter) - email@example.com

Link del proyecto: [https://github.com/tuusuario/TravelQuest](https://github.com/tuusuario/TravelQuest)

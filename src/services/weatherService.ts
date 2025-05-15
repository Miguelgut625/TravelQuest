/**
 * Servicio para obtener información del clima
 */
import { supabase } from './supabase';

// Función para obtener las ciudades donde el usuario tiene viajes
export const getUserJourneyCities = async (userId: string) => {
    try {
        console.log(`Obteniendo ciudades para usuario: ${userId}`);
        // Obtenemos los viajes del usuario y las ciudades relacionadas
        const { data, error } = await supabase
            .from('journeys')
            .select(`
        id,
        cityId,
        cities (
          id,
          name
        )
      `)
            .eq('userId', userId);

        if (error) {
            console.error('Error obteniendo ciudades de viajes:', error);
            return [];
        }

        // Filtrar para obtener solo ciudades válidas y eliminar duplicados
        const uniqueCities = data
            .filter(journey => journey.cities && journey.cities.id && journey.cities.name)
            .map(journey => journey.cities)
            .filter((city, index, self) =>
                index === self.findIndex((c) => c.id === city.id)
            );

        console.log(`Ciudades encontradas: ${uniqueCities.length}`);
        return uniqueCities;
    } catch (error) {
        console.error('Error obteniendo ciudades de viajes del usuario:', error);
        return [];
    }
};

// Función para obtener datos del clima por nombre de ciudad
export const getWeatherByCity = async (cityName: string, apiKey: string) => {
    try {
        console.log(`Obteniendo clima para ciudad: ${cityName}`);
        // Hacemos la petición a OpenWeatherMap API usando el nombre de la ciudad
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&lang=es&appid=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`Error al obtener datos del clima: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Verificar si la respuesta contiene un error
        if (data.cod && data.cod !== 200) {
            throw new Error(`Error en la respuesta del clima: ${data.message || 'Código de error: ' + data.cod}`);
        }

        return data;
    } catch (error) {
        console.error('Error obteniendo datos del clima por ciudad:', error);
        throw error;
    }
};

// Función para obtener datos del clima por coordenadas
export const getWeatherByCoordinates = async (latitude: number, longitude: number, apiKey: string) => {
    try {
        console.log(`Obteniendo clima para coordenadas: ${latitude}, ${longitude}`);
        // Hacemos la petición a OpenWeatherMap API con coordenadas
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=es&appid=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`Error al obtener datos del clima: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Verificar si la respuesta contiene un error
        if (data.cod && data.cod !== 200) {
            throw new Error(`Error en la respuesta del clima: ${data.message || 'Código de error: ' + data.cod}`);
        }

        return data;
    } catch (error) {
        console.error('Error obteniendo datos del clima por coordenadas:', error);
        throw error;
    }
};

// Función para obtener el pronóstico del clima para 7 días por nombre de ciudad
export const getForecastByCity = async (cityName: string, apiKey: string) => {
    try {
        console.log(`Obteniendo pronóstico para ciudad: ${cityName}`);

        // Usar la API de pronóstico estándar de OpenWeatherMap (5 días con intervalos de 3 horas)
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&units=metric&lang=es&appid=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`Error al obtener pronóstico: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Verificar si la respuesta contiene un error
        if (data.cod && data.cod !== "200") {
            throw new Error(`Error en la respuesta del pronóstico: ${data.message || 'Código de error: ' + data.cod}`);
        }

        // Procesar los datos para agruparlos por día
        return processForecastData(data);
    } catch (error) {
        console.error('Error obteniendo pronóstico por ciudad:', error);
        throw error;
    }
};

// Función para obtener el pronóstico del clima para 7 días por coordenadas
export const getForecastByCoordinates = async (latitude: number, longitude: number, apiKey: string) => {
    try {
        console.log(`Obteniendo pronóstico para coordenadas: ${latitude}, ${longitude}`);

        // Usar la API de pronóstico estándar de OpenWeatherMap (5 días con intervalos de 3 horas)
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=es&appid=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`Error al obtener pronóstico: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Verificar si la respuesta contiene un error
        if (data.cod && data.cod !== "200") {
            throw new Error(`Error en la respuesta del pronóstico: ${data.message || 'Código de error: ' + data.cod}`);
        }

        // Procesar los datos para agruparlos por día
        return processForecastData(data);
    } catch (error) {
        console.error('Error obteniendo pronóstico por coordenadas:', error);
        throw error;
    }
};

// Tipos para el procesamiento de los datos del pronóstico
interface ForecastListItem {
    dt: number;
    main: {
        temp: number;
        temp_min: number;
        temp_max: number;
        feels_like: number;
        pressure: number;
        humidity: number;
    };
    weather: Array<{
        id: number;
        main: string;
        description: string;
        icon: string;
    }>;
    wind: {
        speed: number;
        deg: number;
    };
    clouds: {
        all: number;
    };
    pop?: number;
    rain?: {
        '3h'?: number;
    };
}

interface ForecastResponse {
    list: ForecastListItem[];
    city: {
        name: string;
        country: string;
        coord: {
            lat: number;
            lon: number;
        };
        timezone: number;
    };
}

interface DailyForecast {
    dt: number;
    date: Date;
    temp: {
        min: number;
        max: number;
        day: number;
    };
    feels_like: {
        day: number;
    };
    pressure: number;
    humidity: number;
    weather: Array<{
        id: number;
        main: string;
        description: string;
        icon: string;
    }>;
    speed: number;
    deg: number;
    clouds: number;
    pop: number;
    rain: number;
}

interface ProcessedForecast {
    lat: number;
    lon: number;
    timezone: number;
    timezone_offset: number;
    city_name: string;
    country: string;
    daily: DailyForecast[];
}

// Función auxiliar para procesar y agrupar los datos de pronóstico por día
function processForecastData(data: ForecastResponse): ProcessedForecast {
    const { list, city } = data;

    // Objeto para almacenar los datos por día
    const dailyData: { [key: string]: DailyForecast } = {};

    // Agrupar pronósticos por día
    list.forEach(item => {
        // Obtener solo la fecha sin la hora
        const date = new Date(item.dt * 1000);
        const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        if (!dailyData[dateString]) {
            dailyData[dateString] = {
                dt: item.dt,
                date: date,
                temp: {
                    min: item.main.temp_min,
                    max: item.main.temp_max,
                    day: item.main.temp
                },
                feels_like: {
                    day: item.main.feels_like
                },
                pressure: item.main.pressure,
                humidity: item.main.humidity,
                weather: item.weather,
                speed: item.wind.speed,
                deg: item.wind.deg,
                clouds: item.clouds.all,
                pop: item.pop || 0,
                rain: (item.rain && item.rain['3h']) || 0
            };
        } else {
            // Actualizar mínimos y máximos
            dailyData[dateString].temp.min = Math.min(dailyData[dateString].temp.min, item.main.temp_min);
            dailyData[dateString].temp.max = Math.max(dailyData[dateString].temp.max, item.main.temp_max);

            // Actualizar otros datos si es necesario
            // Por ejemplo, podríamos querer los datos del mediodía como representativos
            if (date.getHours() >= 12 && date.getHours() <= 14) {
                dailyData[dateString].temp.day = item.main.temp;
                dailyData[dateString].feels_like.day = item.main.feels_like;
                dailyData[dateString].weather = item.weather;
            }

            // Actualizar probabilidad de precipitación máxima
            dailyData[dateString].pop = Math.max(dailyData[dateString].pop, item.pop || 0);

            // Acumular lluvia
            if (item.rain && item.rain['3h']) {
                dailyData[dateString].rain += item.rain['3h'];
            }
        }
    });

    // Convertir el objeto a un array ordenado por fecha
    const daily = Object.values(dailyData)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 7); // Limitar a 7 días

    // Construir la respuesta en un formato similar a OneCall para evitar cambiar la interfaz
    return {
        lat: city.coord.lat,
        lon: city.coord.lon,
        timezone: city.timezone,
        timezone_offset: 0, // No proporcionado por la API estándar
        city_name: city.name,
        country: city.country,
        daily
    };
}

// Función genérica para obtener datos del clima por ciudad o coordenadas
export const getWeatherData = async ({
    cityName,
    latitude,
    longitude,
    apiKey
}: {
    cityName?: string;
    latitude?: number;
    longitude?: number;
    apiKey: string;
}) => {
    if (cityName) {
        return getWeatherByCity(cityName, apiKey);
    } else if (latitude !== undefined && longitude !== undefined) {
        return getWeatherByCoordinates(latitude, longitude, apiKey);
    } else {
        throw new Error('Debes proporcionar un nombre de ciudad o coordenadas');
    }
}; 
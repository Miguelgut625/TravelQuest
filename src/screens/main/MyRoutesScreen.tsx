import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Route {
  id: string;
  name: string;
  description: string;
  journey_id: string;
  journeys_missions: {
    id: string;
    completed: boolean;
    route_id: string;
    challenges: {
      title: string;
      description: string;
      points: number;
    };
  }[];
}

const MyRoutesScreen = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation();

  useEffect(() => {
    fetchRoutes();
  }, [user]);

  const fetchRoutes = async () => {
    try {
      if (!user?.id) {
        setRoutes([]);
        setLoading(false);
        return;
      }

      const { data: journeysData, error: journeysError } = await supabase
        .from('journeys')
        .select('id')
        .eq('userId', user.id);

      if (journeysError) throw journeysError;

      const journeyIds = journeysData?.map(journey => journey.id) || [];

      if (journeyIds.length === 0) {
        setRoutes([]);
        setLoading(false);
        return;
      }

      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select(`
          id,
          name,
          description,
          journey_id,
          journeys_missions!route_id (
            id,
            completed,
            route_id,
            challenges (
              title,
              description,
              points
            )
          )
        `)
        .in('journey_id', journeyIds);

      if (routesError) throw routesError;

      setRoutes(routesData || []);

    } catch (error) {
      console.error('Error fetching routes:', error);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const renderRouteItem = ({ item }: { item: Route }) => {
    const totalMissions = item.journeys_missions?.length || 0;
    const completedMissions = item.journeys_missions?.filter(m => m.completed).length || 0;
    const totalPoints = item.journeys_missions?.reduce((acc, m) => acc + (m.challenges?.points || 0), 0) || 0;

    return (
      <TouchableOpacity 
        style={styles.routeCard}
        onPress={() => navigation.navigate('RouteDetail', { route: item })}
      >
        <View style={styles.routeHeader}>
          <Text style={styles.routeName}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={24} color="#005F9E" />
        </View>
        <Text style={styles.routeDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.routeStats}>
          <View style={styles.statItem}>
            <Ionicons name="flag" size={16} color="#005F9E" />
            <Text style={styles.statText}>
              {completedMissions}/{totalMissions} misiones
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={16} color="#005F9E" />
            <Text style={styles.statText}>{totalPoints} puntos</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#005F9E" />
          <Text style={styles.loadingText}>Cargando rutas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Rutas</Text>
      </View>
      {routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map" size={64} color="#005F9E" />
          <Text style={styles.emptyText}>No tienes rutas creadas</Text>
          <Text style={styles.emptySubtext}>
            Genera una nueva ruta desde el mapa para comenzar tu aventura
          </Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          renderItem={renderRouteItem}
          keyExtractor={(item) => item.id}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    backgroundColor: '#005F9E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#005F9E',
  },
  listContainer: {
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  routeDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#005F9E',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F9E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MyRoutesScreen; 
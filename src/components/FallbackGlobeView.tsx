import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Animated, Easing, Dimensions, PanResponder } from 'react-native';

const { width, height } = Dimensions.get('window');
const GLOBE_SIZE = Math.min(width, height) * 0.7;

const FallbackGlobeView = (props: { style?: any }) => {
  const [loading, setLoading] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  // Referencias para seguimiento manual de valores actuales
  const currentRotationRef = useRef(0);
  const currentTiltRef = useRef(0);

  // Generador de continentes aleatorios
  const generateContinents = () => {
    const continents = [];
    const numContinents = 7;
    
    for (let i = 0; i < numContinents; i++) {
      continents.push({
        id: i,
        x: Math.random() * 70 + 5,
        y: Math.random() * 70 + 5,
        width: Math.random() * 30 + 10,
        height: Math.random() * 25 + 5,
        rotation: Math.random() * 45 - 22.5,
      });
    }
    
    return continents;
  };
  
  const continents = useRef(generateContinents()).current;
  
  // Configurar animaciones
  useEffect(() => {
    setLoading(false);
    
    // Rotación automática
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Oscilación del eje
    Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, {
          toValue: 0.05,
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tilt, {
          toValue: -0.05,
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Respiración
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.03,
          duration: 5000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 5000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  // Configurar interacción táctil
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        rotation.stopAnimation();
        tilt.stopAnimation();
      },
      onPanResponderMove: (event, gesture) => {
        // Aplicar rotación basada en el movimiento
        const rotationDelta = gesture.dx / 100;
        currentRotationRef.current += rotationDelta;
        rotation.setValue(currentRotationRef.current);
        
        // Aplicar inclinación basada en el movimiento vertical
        const tiltDelta = gesture.dy / 200;
        const newTilt = currentTiltRef.current + tiltDelta;
        
        // Limitar la inclinación a un rango razonable
        if (newTilt > -0.5 && newTilt < 0.5) {
          currentTiltRef.current = newTilt;
          tilt.setValue(newTilt);
        }
      },
      onPanResponderRelease: () => {
        // Reanudar animaciones después de soltar
        Animated.loop(
          Animated.timing(rotation, {
            toValue: 1,
            duration: 30000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
        
        Animated.loop(
          Animated.sequence([
            Animated.timing(tilt, {
              toValue: 0.05,
              duration: 7000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(tilt, {
              toValue: -0.05,
              duration: 7000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
      },
    })
  ).current;
  
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const tiltDegrees = tilt.interpolate({
    inputRange: [-0.5, 0.5],
    outputRange: ['-25deg', '25deg'],
  });
  
  return (
    <View style={[styles.container, props.style]}>
      <View style={styles.starsBackground} />
      
      <View style={styles.globeContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.globe,
            {
              width: GLOBE_SIZE,
              height: GLOBE_SIZE,
              borderRadius: GLOBE_SIZE / 2,
              transform: [
                { perspective: 1000 },
                { scale: scale },
                { rotateY: spin },
                { rotateX: tiltDegrees },
              ],
            },
          ]}
        >
          <View style={styles.globeBase} />
          <View style={styles.gradientAtmosphere} />
          
          <View style={styles.continents}>
            {continents.map((continent) => (
              <Animated.View
                key={continent.id}
                style={[
                  styles.continent,
                  {
                    left: `${continent.x}%`,
                    top: `${continent.y}%`,
                    width: `${continent.width}%`,
                    height: `${continent.height}%`,
                    transform: [{ rotate: `${continent.rotation}deg` }],
                  },
                ]}
              />
            ))}
          </View>
          
          <View style={[styles.highlight, { borderRadius: GLOBE_SIZE / 5 }]} />
          
          <Animated.View
            style={[
              styles.atmosphere,
              {
                width: GLOBE_SIZE * 1.1,
                height: GLOBE_SIZE * 1.1,
                borderRadius: (GLOBE_SIZE * 1.1) / 2,
                top: -GLOBE_SIZE * 0.05,
                left: -GLOBE_SIZE * 0.05,
              },
            ]}
          />
        </Animated.View>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          • Desliza para rotar manualmente{'\n'}
          • Pellizca para hacer zoom{'\n'}
          • Toca para detener la rotación
        </Text>
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando globo terráqueo...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  starsBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    opacity: 0.8,
  },
  globeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globe: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  globeBase: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    backgroundColor: '#005CB2', // Color océano
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  gradientAtmosphere: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    backgroundColor: 'transparent',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  continents: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  continent: {
    position: 'absolute',
    backgroundColor: '#4CAF50', // Color tierra
    borderRadius: 5,
  },
  highlight: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '20%',
    height: '20%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    transform: [{ rotate: '-25deg' }],
  },
  atmosphere: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 10,
    margin: 20,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'left',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

export default FallbackGlobeView; 
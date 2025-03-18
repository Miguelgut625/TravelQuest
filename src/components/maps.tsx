import React from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const Map = Platform.select({
  web: MapView,
  default: MapView,
});

const MapComponent = (props: MapViewProps) => {
  if (Platform.OS === 'web') {
    return (
      <View style={{ height: '100%', width: '100%' }}>
        <MapView
          {...props}
          style={[{ height: '100%', width: '100%' }, props.style]}
        />
      </View>
    );
  }

  return <MapView {...props} />;
};

export const MapMarker = Platform.select({
  web: Marker,
  default: Marker,
});

export default MapComponent;

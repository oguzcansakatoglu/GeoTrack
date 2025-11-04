import React from 'react';
import { View } from 'react-native';

type MapViewProps = React.ComponentProps<typeof View>;

const MockComponent: React.FC<MapViewProps> = props => <View {...props} />;

export const Marker = MockComponent;
export const Polyline = MockComponent;

const MapView: React.FC<MapViewProps> = MockComponent;

export default MapView;

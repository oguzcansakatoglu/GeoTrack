import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import Geolocation, {
  GeoCoordinates,
  GeolocationError,
  GeolocationOptions,
} from 'react-native-geolocation-service';
import {
  PERMISSIONS,
  PermissionStatus,
  RESULTS,
  check,
  openSettings,
  request,
  requestMultiple,
} from 'react-native-permissions';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const INITIAL_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const WATCH_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  distanceFilter: 10,
  interval: 5000,
  fastestInterval: 2000,
  showsBackgroundLocationIndicator: true,
};

const DESTINATION_COORDINATES: { latitude: number; longitude: number } = {
  latitude: 41.0655424,
  longitude: 28.9983691,
};

type PermissionState = 'pending' | 'granted' | 'blocked';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [permissionState, setPermissionState] = useState<PermissionState>('pending');
  const [currentLocation, setCurrentLocation] = useState<GeoCoordinates | null>(
    null,
  );
  const [locationTrail, setLocationTrail] = useState<GeoCoordinates[]>([]);
  const watchId = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const pathCoordinates = useMemo(
    () =>
      locationTrail.map(coords => ({
        latitude: coords.latitude,
        longitude: coords.longitude,
      })),
    [locationTrail],
  );

  const destinationRoute = useMemo(() => {
    if (!currentLocation) {
      return [];
    }

    return [
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      DESTINATION_COORDINATES,
    ];
  }, [currentLocation]);

  const handleOpenSettings = useCallback(() => {
    openSettings().catch(() => {
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
    });
  }, []);

  const requestLocationPermissions = useCallback(async () => {
    setPermissionState('pending');

    if (Platform.OS === 'ios') {
      const statuses = await requestMultiple([
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        PERMISSIONS.IOS.LOCATION_ALWAYS,
      ]);

      const isGranted =
        isResultGranted(statuses[PERMISSIONS.IOS.LOCATION_ALWAYS]) ||
        isResultGranted(statuses[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE]);

      setPermissionState(isGranted ? 'granted' : 'blocked');
      return isGranted;
    }

    const fineStatus = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

    if (!isResultGranted(fineStatus)) {
      setPermissionState(fineStatus === RESULTS.BLOCKED ? 'blocked' : 'pending');
      return false;
    }

    let backgroundStatus = RESULTS.GRANTED;
    if (Platform.Version >= 29) {
      backgroundStatus = await request(
        PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
      );
    }

    const granted = isResultGranted(fineStatus) && isResultGranted(backgroundStatus);

    setPermissionState(granted ? 'granted' : 'blocked');
    return granted;
  }, []);

  const ensurePermissions = useCallback(async () => {
    if (Platform.OS === 'ios') {
      const statuses = await checkMultipleIOSPermissions();
      const granted = statuses.some(isResultGranted);
      if (granted) {
        setPermissionState('granted');
        return true;
      }

      if (
        statuses.every(
          status => status === RESULTS.BLOCKED || status === RESULTS.UNAVAILABLE,
        )
      ) {
        setPermissionState('blocked');
        return false;
      }
    } else {
      const fineStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      const backgroundStatus =
        Platform.Version >= 29
          ? await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION)
          : RESULTS.GRANTED;

      if (
        isResultGranted(fineStatus) &&
        isResultGranted(backgroundStatus)
      ) {
        setPermissionState('granted');
        return true;
      }

      if (
        fineStatus === RESULTS.BLOCKED ||
        backgroundStatus === RESULTS.BLOCKED ||
        fineStatus === RESULTS.UNAVAILABLE ||
        backgroundStatus === RESULTS.UNAVAILABLE
      ) {
        setPermissionState('blocked');
        return false;
      }
    }

    return requestLocationPermissions();
  }, [requestLocationPermissions]);

  const stopLocationUpdates = useCallback(() => {
    if (watchId.current != null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const handleLocationSuccess = useCallback((coords: GeoCoordinates) => {
    setCurrentLocation(coords);
    setLocationTrail(previous => [...previous, coords]);
  }, []);

  const handleLocationError = useCallback((error: GeolocationError) => {
    if (error.code === error.PERMISSION_DENIED) {
      setPermissionState('blocked');
      Alert.alert(
        'Location permission required',
        'Please enable location access to keep tracking your position.',
      );
    }
  }, []);

  const startLocationUpdates = useCallback(async () => {
    const granted = await ensurePermissions();
    if (!granted) {
      return;
    }

    stopLocationUpdates();

    watchId.current = Geolocation.watchPosition(
      position => handleLocationSuccess(position.coords),
      handleLocationError,
      WATCH_OPTIONS,
    );

    Geolocation.getCurrentPosition(
      position => handleLocationSuccess(position.coords),
      handleLocationError,
      { ...WATCH_OPTIONS, timeout: 10000 },
    );
  }, [ensurePermissions, handleLocationError, handleLocationSuccess, stopLocationUpdates]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      Geolocation.setRNConfiguration({
        skipPermissionRequests: true,
        authorizationLevel: 'always',
      });
    } else {
      Geolocation.setRNConfiguration({
        skipPermissionRequests: true,
      });
    }
  }, []);

  useEffect(() => {
    startLocationUpdates();

    return () => {
      stopLocationUpdates();
    };
  }, [startLocationUpdates, stopLocationUpdates]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const previousState = appState.current;
      appState.current = nextState;

      if (previousState.match(/inactive|background/) && nextState === 'active') {
        startLocationUpdates();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [startLocationUpdates]);

  const region = useMemo((): Region => {
    if (!currentLocation) {
      return INITIAL_REGION;
    }

    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [currentLocation]);

  const permissionBlockedContent = useMemo(() => {
    return (
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Location access needed</Text>
        <Text style={styles.overlayMessage}>
          We use your current position to display the map and keep tracking in the
          background. Please enable location access in the system settings.
        </Text>
        <TouchableOpacity
          onPress={handleOpenSettings}
          style={styles.overlayButton}>
          <Text style={styles.overlayButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }, [handleOpenSettings]);

  const loadingContent = useMemo(() => {
    return (
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Requesting permission</Text>
        <Text style={styles.overlayMessage}>
          Accept the location permission prompt to start tracking your journey.
        </Text>
        <TouchableOpacity
          onPress={requestLocationPermissions}
          style={styles.overlayButton}>
          <Text style={styles.overlayButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }, [requestLocationPermissions]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        region={region}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton
        showsCompass
      >
        {currentLocation && (
          <Marker coordinate={currentLocation} title="You" />
        )}
        <Marker
          coordinate={DESTINATION_COORDINATES}
          title="Mock Destination"
          description="Torun Center"
          pinColor="#FF6B6B"
        />
        {pathCoordinates.length > 1 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
          />
        )}
        {destinationRoute.length === 2 && (
          <Polyline
            coordinates={destinationRoute}
            strokeColor="#FF6B6B"
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Live location</Text>
        {currentLocation ? (
          <>
            <Text style={styles.infoText}>
              Latitude: {currentLocation.latitude.toFixed(6)}
            </Text>
            <Text style={styles.infoText}>
              Longitude: {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={styles.infoText}>
              Destination: Torun Center
            </Text>
            <Text style={styles.infoSubtext}>
              Mock destination at {DESTINATION_COORDINATES.latitude.toFixed(6)},{' '}
              {DESTINATION_COORDINATES.longitude.toFixed(6)}.
            </Text>
            <Text style={styles.infoSubtext}>
              Tracking continues while the app runs in the background.
            </Text>
          </>
        ) : (
          <Text style={styles.infoText}>Locating…</Text>
        )}
      </View>
      {permissionState === 'blocked' && permissionBlockedContent}
      {permissionState === 'pending' && loadingContent}
    </View>
  );
}

function isResultGranted(result: PermissionStatus) {
  return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
}

async function checkMultipleIOSPermissions() {
  const statuses = await Promise.all([
    check(PERMISSIONS.IOS.LOCATION_ALWAYS),
    check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE),
  ]);

  return statuses;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  infoCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#f2f2f2',
  },
  infoSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#d0d0d0',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  overlayMessage: {
    fontSize: 16,
    color: '#f2f2f2',
    textAlign: 'center',
    marginBottom: 24,
  },
  overlayButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 999,
  },
  overlayButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default App;

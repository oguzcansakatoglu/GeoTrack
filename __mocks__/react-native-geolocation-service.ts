const noop = () => {};

const Geolocation = {
  getCurrentPosition: (_success: any, _error?: any, _options?: any) => {
    noop();
  },
  watchPosition: (_success: any, _error?: any, _options?: any) => 1,
  clearWatch: (_watchId: number) => {
    noop();
  },
  stopObserving: () => {
    noop();
  },
  setRNConfiguration: (_config: any) => {
    noop();
  },
  requestAuthorization: (_authorizationLevel?: 'always' | 'whenInUse') => {
    return Promise.resolve(true);
  },
};

export const GeolocationError = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
};

export default Geolocation;

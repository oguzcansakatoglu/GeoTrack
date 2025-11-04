module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '^react-native-maps$': '<rootDir>/__mocks__/react-native-maps.tsx',
    '^react-native-geolocation-service$': '<rootDir>/__mocks__/react-native-geolocation-service.ts',
    '^react-native-permissions$': '<rootDir>/__mocks__/react-native-permissions.ts',
  },
};

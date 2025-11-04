export const RESULTS = {
  UNAVAILABLE: 'unavailable',
  DENIED: 'denied',
  BLOCKED: 'blocked',
  GRANTED: 'granted',
  LIMITED: 'limited',
} as const;

export const PERMISSIONS = {
  ANDROID: {
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_BACKGROUND_LOCATION: 'android.permission.ACCESS_BACKGROUND_LOCATION',
  },
  IOS: {
    LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
    LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
  },
} as const;

export type PermissionStatus = typeof RESULTS[keyof typeof RESULTS];

type PermissionMap = Record<string, PermissionStatus>;

const permissionState: PermissionMap = {};

export const check = async (permission: string): Promise<PermissionStatus> => {
  return permissionState[permission] ?? RESULTS.GRANTED;
};

export const request = async (
  permission: string,
): Promise<PermissionStatus> => {
  permissionState[permission] = RESULTS.GRANTED;
  return RESULTS.GRANTED;
};

export const requestMultiple = async (
  permissions: string[],
): Promise<PermissionMap> => {
  const statuses: PermissionMap = {};
  permissions.forEach(permission => {
    statuses[permission] = RESULTS.GRANTED;
    permissionState[permission] = RESULTS.GRANTED;
  });
  return statuses;
};

export const openSettings = async (): Promise<void> => {
  return Promise.resolve();
};

export const checkMultipleIOSPermissions = async (): Promise<PermissionStatus[]> => {
  return [RESULTS.GRANTED];
};

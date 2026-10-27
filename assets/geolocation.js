export class LocationError extends Error {
  messageKey;
  constructor(messageKey) {
    super(messageKey);
    this.messageKey = messageKey;
  }
}
export function getCurrentLocation() {
  if (!window.isSecureContext) {
    return Promise.reject(new LocationError("Location requires HTTPS or localhost."));
  }
  if (!navigator.geolocation) {
    return Promise.reject(new LocationError("Your browser does not support location services."));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (error) => {
        const messageKey =
          error.code === 1
            ? "Location access denied. Allow location access in your browser and try again."
            : error.code === 3
              ? "Location request timed out. Please try again."
              : "Unable to determine your location. Check your device's location services and try again.";
        reject(new LocationError(messageKey));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}

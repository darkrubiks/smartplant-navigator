import { useEffect, useRef, useState } from "react";
import { getCurrentLocation, LocationError, type CurrentLocation } from "@/lib/geolocation";
import type { MessageKey } from "@/lib/i18n";

export function useCurrentLocation() {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const mounted = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function locate() {
    if (pending.current) return;
    pending.current = true;
    setLocating(true);
    setError(null);
    try {
      const position = await getCurrentLocation();
      if (mounted.current) setLocation(position);
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof LocationError
            ? cause.messageKey
            : "Unable to determine your location. Check your device's location services and try again.",
        );
      }
    } finally {
      pending.current = false;
      if (mounted.current) setLocating(false);
    }
  }

  return { location, locating, error, locate, clearLocation: () => setLocation(null) };
}

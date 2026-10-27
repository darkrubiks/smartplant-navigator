import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getCurrentLocation, LocationError } from "../assets/geolocation.js";
function mockBrowser(t, geolocation, secure = true) {
  for (const [key, value] of Object.entries({
    window: { isSecureContext: secure },
    navigator: { geolocation },
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
}
test("location requests a fresh high-accuracy fix and preserves the actual coordinates", async (t) => {
  mockBrowser(t, {
    getCurrentPosition(success, _error, options) {
      assert.deepEqual(options, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
      success({
        coords: { latitude: -23.671234, longitude: -46.591234, accuracy: 8 },
      });
    },
  });
  assert.deepEqual(await getCurrentLocation(), {
    latitude: -23.671234,
    longitude: -46.591234,
    accuracy: 8,
  });
});
test("zero latitude and longitude remain valid coordinates", async (t) => {
  mockBrowser(t, {
    getCurrentPosition(success) {
      success({ coords: { latitude: 0, longitude: 0, accuracy: 0 } });
    },
  });
  assert.deepEqual(await getCurrentLocation(), { latitude: 0, longitude: 0, accuracy: 0 });
});
for (const [code, message] of [
  [1, "Location access denied. Allow location access in your browser and try again."],
  [2, "Unable to determine your location. Check your device's location services and try again."],
  [3, "Location request timed out. Please try again."],
]) {
  test(`location error ${code} provides actionable feedback instead of a fake position`, async (t) => {
    mockBrowser(t, {
      getCurrentPosition(_success, error) {
        error?.({ code });
      },
    });
    await assert.rejects(getCurrentLocation(), (error) => {
      assert.ok(error instanceof LocationError);
      assert.equal(error.messageKey, message);
      return true;
    });
  });
}
test("unsupported browsers report that location services are unavailable", async (t) => {
  mockBrowser(t);
  await assert.rejects(getCurrentLocation(), {
    message: "Your browser does not support location services.",
  });
});
test("insecure pages explain the HTTPS requirement without requesting location", async (t) => {
  mockBrowser(
    t,
    {
      getCurrentPosition() {
        assert.fail("An insecure page must not request location");
      },
    },
    false,
  );
  await assert.rejects(getCurrentLocation(), { message: "Location requires HTTPS or localhost." });
});
test("a failed location request can be retried successfully", async (t) => {
  let attempts = 0;
  mockBrowser(t, {
    getCurrentPosition(success, error) {
      if (attempts++ === 0) error?.({ code: 3 });
      else success({ coords: { latitude: 12, longitude: 34, accuracy: 10 } });
    },
  });
  await assert.rejects(getCurrentLocation());
  assert.deepEqual(await getCurrentLocation(), { latitude: 12, longitude: 34, accuracy: 10 });
});

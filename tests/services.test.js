const { validateCoordinates } = require('../services/geoUtils');
const { matchTrips, distanceKm } = require('../services/tripMatchingService');

describe('geolocation services', () => {
    test('accepts and normalizes valid coordinates', () => {
        expect(validateCoordinates({ latitude: '34.02', longitude: '-6.84' })).toEqual({ latitude: 34.02, longitude: -6.84 });
    });

    test('rejects invalid coordinates', () => {
        expect(() => validateCoordinates({ latitude: 95, longitude: 0 })).toThrow('Invalid coordinates');
    });

    test('ranks nearby trips and excludes trips without seats', () => {
        const results = matchTrips([
            { id: 'near', origin: { latitude: 34.02, longitude: -6.84 }, destination: { latitude: 33.57, longitude: -7.59 }, departureTime: '2026-09-06T10:00:00Z', availableSeats: 2 },
            { id: 'full', origin: { latitude: 34.02, longitude: -6.84 }, destination: { latitude: 33.57, longitude: -7.59 }, departureTime: '2026-09-06T10:00:00Z', availableSeats: 0 }
        ], { originLat: 34.02, originLng: -6.84, destinationLat: 33.57, destinationLng: -7.59, departureTime: '2026-09-06T10:05:00Z', seats: 1 });
        expect(results).toHaveLength(1);
        expect(results[0].trip.id).toBe('near');
        expect(results[0].matchScore).toBeGreaterThan(90);
    });

    test('calculates a non-negative distance', () => {
        expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeGreaterThan(0);
    });
});
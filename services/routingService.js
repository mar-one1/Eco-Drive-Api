const { validateCoordinates } = require('./geoUtils');

const calculateRoute = async (origin, destination) => {
    const start = validateCoordinates(origin);
    const end = validateCoordinates(destination);
    const baseUrl = process.env.OSRM_URL || 'https://router.project-osrm.org';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
        const response = await fetch(`${baseUrl}/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=polyline`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Routing provider returned ${response.status}`);
        const data = await response.json();
        const route = data.routes && data.routes[0];
        if (!route) throw new Error('No route found');
        return {
            distanceMeters: Math.round(route.distance),
            durationSeconds: Math.round(route.duration),
            distanceKm: Number((route.distance / 1000).toFixed(2)),
            durationMinutes: Math.round(route.duration / 60),
            geometry: route.geometry
        };
    } finally {
        clearTimeout(timeout);
    }
};

module.exports = { calculateRoute };

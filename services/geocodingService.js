const { validateCoordinates } = require('./geoUtils');

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const providerUrl = () => process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

const fetchJson = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'Eco-Drive-API/1.0 contact-admin' }
        });
        if (!response.ok) throw new Error(`Geocoding provider returned ${response.status}`);
        return response.json();
    } finally {
        clearTimeout(timeout);
    }
};

const getCached = (key) => {
    const item = cache.get(key);
    if (!item || item.expiresAt < Date.now()) {
        cache.delete(key);
        return null;
    }
    return item.value;
};

const setCached = (key, value) => cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });

const search = async (query) => {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery) throw Object.assign(new Error('Query is required'), { code: 'VALIDATION_ERROR' });
    const key = `search:${normalizedQuery.toLowerCase()}`;
    const cached = getCached(key);
    if (cached) return cached;
    const data = await fetchJson(`${providerUrl()}/search?format=jsonv2&limit=5&q=${encodeURIComponent(normalizedQuery)}`);
    const result = data.map((item) => ({
        name: item.name || item.display_name.split(',')[0],
        displayName: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        label: item.display_name.split(',')[0],
        value: item.name || item.display_name.split(',')[0]
    }));
    setCached(key, result);
    return result;
};

const reverse = async (coordinates) => {
    const point = validateCoordinates(coordinates);
    const key = `reverse:${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`;
    const cached = getCached(key);
    if (cached) return cached;
    const data = await fetchJson(`${providerUrl()}/reverse?format=jsonv2&lat=${point.latitude}&lon=${point.longitude}`);
    const result = {
        name: data.name || data.display_name.split(',')[0],
        displayName: data.display_name,
        latitude: point.latitude,
        longitude: point.longitude
    };
    setCached(key, result);
    return result;
};

module.exports = { search, reverse };

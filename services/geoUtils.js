const isValidCoordinate = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;

const validateCoordinates = (coordinates) => {
    if (!coordinates || !isValidCoordinate(coordinates.latitude, -90, 90) || !isValidCoordinate(coordinates.longitude, -180, 180)) {
        const error = new Error('Invalid coordinates');
        error.code = 'VALIDATION_ERROR';
        throw error;
    }
    return { latitude: Number(coordinates.latitude), longitude: Number(coordinates.longitude) };
};

module.exports = { validateCoordinates };

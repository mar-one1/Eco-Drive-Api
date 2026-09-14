const distanceKm = (first, second) => {
    const radians = (value) => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const deltaLat = radians(second.latitude - first.latitude);
    const deltaLng = radians(second.longitude - first.longitude);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(deltaLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const matchTrips = (trips, criteria) => {
    const origin = { latitude: Number(criteria.originLat), longitude: Number(criteria.originLng) };
    const destination = { latitude: Number(criteria.destinationLat), longitude: Number(criteria.destinationLng) };
    const requestedTime = new Date(criteria.departureTime).getTime();
    const seats = Number(criteria.seats || 1);

    return trips.map((trip) => {
        const tripOrigin = trip.origin || {};
        const tripDestination = trip.destination || {};
        const originDistanceKm = distanceKm(origin, tripOrigin);
        const destinationDistanceKm = distanceKm(destination, tripDestination);
        const tripTime = new Date(trip.departureTime || `${trip.date}T${trip.time}`).getTime();
        const departureDifferenceMinutes = Math.round(Math.abs(tripTime - requestedTime) / 60000);
        const proximityScore = Math.max(0, 45 - originDistanceKm * 4) + Math.max(0, 35 - destinationDistanceKm * 4);
        const timeScore = Math.max(0, 20 - departureDifferenceMinutes / 3);
        const matchScore = Math.max(0, Math.min(100, Math.round(proximityScore + timeScore)));
        return { trip, matchScore, originDistanceKm: Number(originDistanceKm.toFixed(2)), destinationDistanceKm: Number(destinationDistanceKm.toFixed(2)), departureDifferenceMinutes };
    }).filter((result) => (result.trip.availableSeats ?? result.trip.seats ?? 0) >= seats)
        .sort((first, second) => second.matchScore - first.matchScore);
};

module.exports = { matchTrips, distanceKm };

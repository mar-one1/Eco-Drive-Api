const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Trip = require('./models/Trip');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const EcoStat = require('./models/EcoStat');
const Notification = require('./models/Notification');
const Transaction = require('./models/Transaction');
const UserPreference = require('./models/UserPreference');
const SavedTrip = require('./models/SavedTrip');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eco-drive';

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Trip.deleteMany({});
        await Booking.deleteMany({});
        await Review.deleteMany({});
        await EcoStat.deleteMany({});
        await Notification.deleteMany({});
        await Transaction.deleteMany({});
        await UserPreference.deleteMany({});
        await SavedTrip.deleteMany({});
        console.log('Cleared existing data');

        // Hash password
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create users
        const users = await User.create([
            {
                name: 'John Driver',
                email: 'john@example.com',
                password: hashedPassword,
                phone: '+1234567890',
                role: 'driver'
            },
            {
                name: 'Jane Driver',
                email: 'jane@example.com',
                password: hashedPassword,
                phone: '+1234567891',
                role: 'driver'
            },
            {
                name: 'Bob Passenger',
                email: 'bob@example.com',
                password: hashedPassword,
                phone: '+1234567892',
                role: 'passenger'
            },
            {
                name: 'Alice Passenger',
                email: 'alice@example.com',
                password: hashedPassword,
                phone: '+1234567893',
                role: 'passenger'
            },
            {
                name: 'Admin User',
                email: 'admin@example.com',
                password: hashedPassword,
                phone: '+1234567894',
                role: 'admin'
            }
        ]);
        console.log(`Created ${users.length} users`);

        const driver1 = users[0]._id.toString();
        const driver2 = users[1]._id.toString();
        const passenger1 = users[2]._id.toString();
        const passenger2 = users[3]._id.toString();

        // Create trips
        const trips = await Trip.create([
            {
                from: 'New York',
                to: 'Boston',
                date: '2026-09-15',
                time: '08:00',
                seats: 4,
                price: 35,
                origin: {
                    name: 'New York, NY',
                    latitude: 40.7128,
                    longitude: -74.0060
                },
                destination: {
                    name: 'Boston, MA',
                    latitude: 42.3601,
                    longitude: -71.0589
                },
                departureTime: new Date('2026-09-15T08:00:00'),
                availableSeats: 4,
                distanceMeters: 348000,
                durationSeconds: 12600,
                driverId: driver1,
                driverName: 'John Driver',
                status: 'active'
            },
            {
                from: 'Boston',
                to: 'New York',
                date: '2026-09-16',
                time: '10:00',
                seats: 3,
                price: 35,
                origin: {
                    name: 'Boston, MA',
                    latitude: 42.3601,
                    longitude: -71.0589
                },
                destination: {
                    name: 'New York, NY',
                    latitude: 40.7128,
                    longitude: -74.0060
                },
                departureTime: new Date('2026-09-16T10:00:00'),
                availableSeats: 3,
                distanceMeters: 348000,
                durationSeconds: 12600,
                driverId: driver2,
                driverName: 'Jane Driver',
                status: 'active'
            },
            {
                from: 'San Francisco',
                to: 'Los Angeles',
                date: '2026-09-17',
                time: '07:00',
                seats: 2,
                price: 50,
                origin: {
                    name: 'San Francisco, CA',
                    latitude: 37.7749,
                    longitude: -122.4194
                },
                destination: {
                    name: 'Los Angeles, CA',
                    latitude: 34.0522,
                    longitude: -118.2437
                },
                departureTime: new Date('2026-09-17T07:00:00'),
                availableSeats: 2,
                distanceMeters: 590000,
                durationSeconds: 21600,
                driverId: driver1,
                driverName: 'John Driver',
                status: 'scheduled'
            },
            {
                from: 'Chicago',
                to: 'Detroit',
                date: '2026-09-18',
                time: '14:00',
                seats: 4,
                price: 25,
                origin: {
                    name: 'Chicago, IL',
                    latitude: 41.8781,
                    longitude: -87.6298
                },
                destination: {
                    name: 'Detroit, MI',
                    latitude: 42.3314,
                    longitude: -83.0458
                },
                departureTime: new Date('2026-09-18T14:00:00'),
                availableSeats: 4,
                distanceMeters: 450000,
                durationSeconds: 16200,
                driverId: driver2,
                driverName: 'Jane Driver',
                status: 'active'
            }
        ]);
        console.log(`Created ${trips.length} trips`);

        // Create bookings
        const bookings = await Booking.create([
            {
                tripId: trips[0]._id.toString(),
                passengerId: passenger1,
                seatsBooked: 2,
                status: 'confirmed'
            },
            {
                tripId: trips[0]._id.toString(),
                passengerId: passenger2,
                seatsBooked: 1,
                status: 'confirmed'
            },
            {
                tripId: trips[1]._id.toString(),
                passengerId: passenger1,
                seatsBooked: 1,
                status: 'pending'
            },
            {
                tripId: trips[3]._id.toString(),
                passengerId: passenger2,
                seatsBooked: 2,
                status: 'confirmed'
            }
        ]);
        console.log(`Created ${bookings.length} bookings`);

        // Create reviews
        const reviews = await Review.create([
            {
                tripId: trips[0]._id.toString(),
                fromUserId: passenger1,
                toUserId: driver1,
                rating: 5,
                comment: 'Great driver, very punctual!',
                category: 'driver'
            },
            {
                tripId: trips[0]._id.toString(),
                fromUserId: driver1,
                toUserId: passenger1,
                rating: 4,
                comment: 'Nice passenger, respectful.',
                category: 'passenger'
            },
            {
                tripId: trips[1]._id.toString(),
                fromUserId: passenger2,
                toUserId: driver2,
                rating: 5,
                comment: 'Excellent ride, smooth driving!',
                category: 'driver'
            }
        ]);
        console.log(`Created ${reviews.length} reviews`);

        // Create eco stats
        const ecoStats = await EcoStat.create([
            {
                userId: driver1,
                totalTripsAsDriver: 15,
                totalTripsAsPassenger: 3,
                totalDistance: 2500,
                totalCarbonSaved: 450,
                totalPassengersCarried: 28,
                averageRating: 4.8,
                totalReviews: 12,
                carbonFootprintReduction: 450,
                ecoLevel: 'eco-warrior',
                achievements: [
                    {
                        name: 'First Trip',
                        description: 'Completed your first trip as driver',
                        earnedAt: new Date('2026-08-01')
                    },
                    {
                        name: 'Carbon Saver',
                        description: 'Saved 100kg of carbon',
                        earnedAt: new Date('2026-08-15')
                    }
                ],
                monthlyStats: [
                    {
                        month: '2026-08',
                        tripsAsDriver: 8,
                        tripsAsPassenger: 1,
                        distance: 1200,
                        carbonSaved: 220
                    }
                ]
            },
            {
                userId: driver2,
                totalTripsAsDriver: 10,
                totalTripsAsPassenger: 5,
                totalDistance: 1800,
                totalCarbonSaved: 320,
                totalPassengersCarried: 18,
                averageRating: 4.5,
                totalReviews: 8,
                carbonFootprintReduction: 320,
                ecoLevel: 'eco-conscious',
                achievements: [
                    {
                        name: 'First Trip',
                        description: 'Completed your first trip as driver',
                        earnedAt: new Date('2026-08-05')
                    }
                ],
                monthlyStats: [
                    {
                        month: '2026-08',
                        tripsAsDriver: 5,
                        tripsAsPassenger: 2,
                        distance: 800,
                        carbonSaved: 150
                    }
                ]
            },
            {
                userId: passenger1,
                totalTripsAsDriver: 0,
                totalTripsAsPassenger: 8,
                totalDistance: 600,
                totalCarbonSaved: 120,
                totalPassengersCarried: 0,
                averageRating: 4.0,
                totalReviews: 3,
                carbonFootprintReduction: 120,
                ecoLevel: 'eco-conscious',
                achievements: [],
                monthlyStats: [
                    {
                        month: '2026-08',
                        tripsAsDriver: 0,
                        tripsAsPassenger: 4,
                        distance: 300,
                        carbonSaved: 60
                    }
                ]
            },
            {
                userId: passenger2,
                totalTripsAsDriver: 0,
                totalTripsAsPassenger: 5,
                totalDistance: 400,
                totalCarbonSaved: 80,
                totalPassengersCarried: 0,
                averageRating: 0,
                totalReviews: 0,
                carbonFootprintReduction: 80,
                ecoLevel: 'newbie',
                achievements: [],
                monthlyStats: []
            }
        ]);
        console.log(`Created ${ecoStats.length} eco stats`);

        // Create notifications
        const notifications = await Notification.create([
            {
                userId: passenger1,
                type: 'booking_confirmed',
                title: 'Booking Confirmed',
                message: 'Your booking for New York to Boston has been confirmed',
                read: false
            },
            {
                userId: driver1,
                type: 'message',
                title: 'New Booking',
                message: 'Bob Passenger has booked 2 seats on your trip',
                read: false
            },
            {
                userId: passenger2,
                type: 'reminder',
                title: 'Trip Reminder',
                message: 'Your trip to Boston is tomorrow at 10:00 AM',
                read: true
            }
        ]);
        console.log(`Created ${notifications.length} notifications`);

        // Create transactions
        const transactions = await Transaction.create([
            {
                userId: passenger1,
                type: 'payment',
                amount: 70,
                description: 'Payment for trip: New York to Boston',
                status: 'completed',
                tripId: trips[0]._id.toString()
            },
            {
                userId: driver1,
                type: 'reward',
                amount: 65,
                description: 'Earning from trip: New York to Boston',
                status: 'completed',
                tripId: trips[0]._id.toString()
            },
            {
                userId: passenger2,
                type: 'payment',
                amount: 50,
                description: 'Payment for trip: Chicago to Detroit',
                status: 'completed',
                tripId: trips[3]._id.toString()
            }
        ]);
        console.log(`Created ${transactions.length} transactions`);

        // Create user preferences
        const userPreferences = await UserPreference.create([
            {
                userId: passenger1,
                smokingAllowed: false,
                petsAllowed: true,
                musicPreference: 'moderate',
                conversationPreference: 'moderate'
            },
            {
                userId: passenger2,
                smokingAllowed: false,
                petsAllowed: false,
                musicPreference: 'quiet',
                conversationPreference: 'quiet'
            }
        ]);
        console.log(`Created ${userPreferences.length} user preferences`);

        // Create saved trips
        const savedTrips = await SavedTrip.create([
            {
                userId: passenger1,
                fromLocation: 'Boston',
                toLocation: 'New York',
                nickname: 'Weekend trip to NYC'
            },
            {
                userId: passenger2,
                fromLocation: 'San Francisco',
                toLocation: 'Los Angeles',
                nickname: 'California road trip'
            }
        ]);
        console.log(`Created ${savedTrips.length} saved trips`);

        console.log('\n✅ Seed data created successfully!');
        console.log('\nTest users:');
        console.log('  john@example.com (driver) - password123');
        console.log('  jane@example.com (driver) - password123');
        console.log('  bob@example.com (passenger) - password123');
        console.log('  alice@example.com (passenger) - password123');
        console.log('  admin@example.com (admin) - password123');

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
};

seedData();

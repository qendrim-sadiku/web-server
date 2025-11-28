/**
 * Script to add participants to bookings for a specific user
 * Usage: node scripts/addParticipantsToUser.js
 */

const sequelize = require('../config/sequelize');
const Booking = require('../models/Bookings/Booking');
const Participant = require('../models/Bookings/Participant');

/**
 * Add participants to bookings for user ID 621
 */
async function addParticipantsToUser(userId = 621) {
  try {
    console.log('='.repeat(60));
    console.log(`Adding participants to bookings for user ID: ${userId}`);
    console.log('='.repeat(60));

    // Find all bookings for this user
    const bookings = await Booking.findAll({
      where: { userId },
      attributes: ['id', 'userId', 'serviceId', 'trainerId', 'status']
    });

    if (bookings.length === 0) {
      console.log(`No bookings found for user ID ${userId}`);
      return;
    }

    console.log(`Found ${bookings.length} booking(s) for user ID ${userId}\n`);

    // Sample participants data
    const sampleParticipants = [
      {
        name: 'John',
        surname: 'Doe',
        category: 'Adult',
        age: null // Adults don't need age
      },
      {
        name: 'Jane',
        surname: 'Smith',
        category: 'Adult',
        age: null
      },
      {
        name: 'Alex',
        surname: 'Johnson',
        category: 'Teenager',
        age: 16
      },
      {
        name: 'Emma',
        surname: 'Williams',
        category: 'Child',
        age: 10
      }
    ];

    let totalAdded = 0;

    for (const booking of bookings) {
      // Check if participants already exist for this booking
      const existingParticipants = await Participant.findAll({
        where: { bookingId: booking.id }
      });

      console.log(`Booking ID: ${booking.id}`);
      console.log(`  Existing participants: ${existingParticipants.length}`);

      // Add 2-3 random participants to each booking
      const numToAdd = Math.floor(Math.random() * 2) + 2; // 2 or 3 participants
      const selectedParticipants = sampleParticipants
        .sort(() => Math.random() - 0.5)
        .slice(0, numToAdd)
        .map(p => ({
          ...p,
          bookingId: booking.id
        }));

      try {
        const created = await Participant.bulkCreate(selectedParticipants, {
          returning: true
        });
        console.log(`  ✅ Added ${created.length} participant(s):`);
        created.forEach(p => {
          console.log(`     - ${p.name} ${p.surname} (${p.category}${p.age ? `, age ${p.age}` : ''})`);
        });
        totalAdded += created.length;
      } catch (error) {
        console.error(`  ❌ Error adding participants to booking ${booking.id}:`, error.message);
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`✅ Total participants added: ${totalAdded}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error adding participants:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.\n');

    // Add participants for user 621
    await addParticipantsToUser(621);

  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { addParticipantsToUser };



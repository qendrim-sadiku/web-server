/**
 * Central place for all booking status strings so we never mistype.
 * Feel free to add more if needed.
 */
module.exports = {
  PENDING:      'pending',
  ACTIVE:       'active',
  IN_PROGRESS:  'in_progress',
  COMPLETED:    'completed',
  CANCELED:     'canceled',
  REJECTED:     'rejected',

  /** Which states should block a time-slot in availability. */
  blocksSlot: ['pending', 'active', 'in_progress'],
};

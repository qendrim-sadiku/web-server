const { getWorker } = require('./worker');
const { mediaCodecs } = require('./mediaConfig');

/**
 * rooms = Map<roomId, Room>
 * Room = {
 *   router: mediasoup.Router,
 *   peers: Map<socketId, Peer>,
 *   hostId: string | null,
 *   hostKey: string | null,
 *   locked: boolean,
 *   pending: Map<socketId, { displayName: string|null, requestedAt: number }>
 * }
 *
 * Peer = {
 *   transports: Set<Transport>,
 *   producers: Set<Producer>,
 *   consumers: Set<Consumer>,
 *   rtpCapabilities: any,
 *   role: 'host' | 'guest',
 *   displayName: string | null
 * }
 */
const rooms = new Map();

async function getOrCreateRoom(roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);

  const worker = await getWorker();
  const router = await worker.createRouter({ mediaCodecs });

  const room = {
    router,
    peers: new Map(),
    hostId: null,
    hostKey: null,
    locked: false,
    pending: new Map()
  };

  rooms.set(roomId, room);
  console.log(`[SFU] created room ${roomId}`);
  return room;
}

function ensurePeer(room, socketId, role = 'guest') {
  if (!room.peers.has(socketId)) {
    room.peers.set(socketId, {
      transports: new Set(),
      producers: new Set(),
      consumers: new Set(),
      rtpCapabilities: null,
      role,
      displayName: null
    });
  } else {
    const p = room.peers.get(socketId);
    if (role && p.role !== role) p.role = role;
  }
  return room.peers.get(socketId);
}

function removePeer(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const peer = room.peers.get(socketId);
  if (!peer) return;

  for (const c of peer.consumers) try { c.close(); } catch {}
  for (const p of peer.producers) try { p.close(); } catch {}
  for (const t of peer.transports) try { t.close(); } catch {}

  if (room.hostId === socketId) room.hostId = null;

  room.peers.delete(socketId);
  room.pending.delete(socketId);

  if (!room.peers.size) {
    try { room.router.close(); } catch {}
    rooms.delete(roomId);
    console.log(`[SFU] removed empty room ${roomId}`);
  }
}

function isLocked(roomId) {
  const room = rooms.get(roomId);
  return !!(room && room.locked);
}

function setLocked(roomId, locked) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };
  room.locked = !!locked;
  return { ok: true, locked: room.locked };
}

function getRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const peers = [];
  for (const [sid, p] of room.peers) {
    peers.push({ peerId: sid, role: p.role, displayName: p.displayName || null });
  }
  return { hostId: room.hostId, locked: room.locked, peers };
}

function listProducers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  const items = [];
  for (const [sid, p] of room.peers) {
    for (const prod of p.producers) {
      items.push({ producerId: prod.id, kind: prod.kind, ownerPeerId: sid });
    }
  }
  return items;
}

module.exports = {
  rooms,
  getOrCreateRoom,
  ensurePeer,
  removePeer,
  isLocked,
  setLocked,
  getRoomState,
  listProducers
};

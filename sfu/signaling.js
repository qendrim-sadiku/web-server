// sfu/signaling.js
const { Server } = require('socket.io');
const {
  rooms,
  getOrCreateRoom,
  ensurePeer,
  removePeer,
  getRoomState,
  isLocked,
  setLocked,
  listProducers
} = require('./roomStore');
const { createWebRtcTransport } = require('./transport');

function initSfuSignaling(server, opts = {}) {
  const allowedOrigins =
    (opts.allowedOrigins && Array.isArray(opts.allowedOrigins))
      ? opts.allowedOrigins
      : ['http://localhost:4200'];

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    let roomId = null;
    console.log('[SFU] socket connected', socket.id);

    const emitRoomState = () => {
      if (!roomId) return;
      const state = getRoomState(roomId);
      if (state) io.to(roomId).emit('roomState', state);
    };

    socket.on('disconnect', () => {
      console.log('[SFU] socket disconnected', socket.id);
      if (roomId) removePeer(roomId, socket.id);
      emitRoomState();
      if (roomId) io.to(roomId).emit('producerClosedByDisconnect', { peerId: socket.id });
      roomId = null;
    });

    // JOIN ROOM
    socket.on('joinRoom', async (payload, cb = () => {}) => {
      const safeCb = (x) => { try { cb(x); } catch {} };
      try {
        console.log('[JOIN_ROOM] payload=', payload);
        const requested = payload?.roomId;
        const displayName = payload?.displayName || null;
        const rtpCapabilities = payload?.rtpCapabilities || null;

        if (!requested || typeof requested !== 'string') {
          console.warn('[JOIN_ROOM] missing roomId');
          return safeCb({ ok: false, error: 'NO_ROOM_ID' });
        }

        const room = await getOrCreateRoom(requested);
        roomId = requested;

        // First peer becomes host
        if (room.hostId === null) {
          const peer = ensurePeer(room, socket.id, 'host');
          peer.rtpCapabilities = rtpCapabilities;
          peer.displayName = displayName;

          room.hostId = socket.id;

          socket.join(roomId);
          socket.emit('routerRtpCapabilities', room.router.rtpCapabilities);
          socket.emit('currentProducers', listProducers(roomId));

          emitRoomState();
          return safeCb({ ok: true, role: 'host' });
        }

        // Room has host already
        if (isLocked(roomId)) {
          room.pending.set(socket.id, { displayName, requestedAt: Date.now() });
          if (room.hostId) {
            io.to(room.hostId).emit('joinRequest', { peerId: socket.id, displayName });
          }
          return safeCb({ ok: true, pending: true });
        }

        // Unlocked: join as guest
        const peer = ensurePeer(room, socket.id, 'guest');
        peer.rtpCapabilities = rtpCapabilities;
        peer.displayName = displayName;

        socket.join(roomId);
        socket.emit('routerRtpCapabilities', room.router.rtpCapabilities);
        socket.emit('currentProducers', listProducers(roomId));

        emitRoomState();
        return safeCb({ ok: true, role: 'guest' });
      } catch (e) {
        console.error('[JOIN_ROOM] error:', e);
        return cb({ ok: false, error: 'JOIN_FAILED' });
      }
    });

    // GET STATE
    socket.on('getRoomState', (_, cb = () => {}) => {
      if (!roomId) return cb(null);
      cb(getRoomState(roomId));
    });

    // LOCK
    socket.on('setLocked', ({ locked }, cb = () => {}) => {
      if (!roomId) return cb({ ok: false, error: 'NO_ROOM' });
      const room = rooms.get(roomId);
      if (!room) return cb({ ok: false, error: 'NO_ROOM' });
      if (room.hostId && room.hostId !== socket.id)
        return cb({ ok: false, error: 'NOT_HOST' });

      const res = setLocked(roomId, !!locked);
      emitRoomState();
      cb(res);
    });

    // APPROVE
    socket.on('approveJoin', async ({ targetPeerId, rtpCapabilities }, cb = () => {}) => {
      if (!roomId) return cb({ ok: false, error: 'NO_ROOM' });
      const room = rooms.get(roomId);
      if (!room) return cb({ ok: false, error: 'NO_ROOM' });
      if (room.hostId && room.hostId !== socket.id)
        return cb({ ok: false, error: 'NOT_HOST' });

      const pending = room.pending.get(targetPeerId);
      if (!pending) return cb({ ok: false, error: 'NOT_PENDING' });

      const peer = ensurePeer(room, targetPeerId, 'guest');
      peer.rtpCapabilities = rtpCapabilities || peer.rtpCapabilities || null;
      peer.displayName = peer.displayName || pending.displayName || null;

      try {
        const s = io.sockets.sockets.get(targetPeerId);
        if (s) {
          s.join(roomId);
          s.emit('routerRtpCapabilities', room.router.rtpCapabilities);
          s.emit('currentProducers', listProducers(roomId));
          s.emit('joinApproved');
        }
        room.pending.delete(targetPeerId);
        emitRoomState();
        cb({ ok: true });
      } catch (e) {
        console.error('[approveJoin] error', e);
        cb({ ok: false, error: 'APPROVE_FAILED' });
      }
    });

    // DENY
    socket.on('denyJoin', ({ targetPeerId }, cb = () => {}) => {
      if (!roomId) return cb({ ok: false, error: 'NO_ROOM' });
      const room = rooms.get(roomId);
      if (!room) return cb({ ok: false, error: 'NO_ROOM' });
      if (room.hostId && room.hostId !== socket.id)
        return cb({ ok: false, error: 'NOT_HOST' });

      if (room.pending.has(targetPeerId)) {
        const s = io.sockets.sockets.get(targetPeerId);
        if (s) s.emit('joinDenied');
        room.pending.delete(targetPeerId);
      }
      cb({ ok: true });
    });

    // CREATE TRANSPORT
    socket.on('createTransport', async ({ direction }, cb) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return cb({ error: 'NO_ROOM' });
        const peer = ensurePeer(room, socket.id);
        const transport = await createWebRtcTransport(room.router, peer);
        cb({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          direction: direction || 'send'
        });

        // ✅ Idempotent connect (prevents "connect() already called")
        socket.on('connectTransport', async ({ transportId, dtlsParameters }, done) => {
          try {
            const t = [...ensurePeer(room, socket.id).transports].find(x => x.id === transportId);
            if (!t) return done({ error: 'NO_TRANSPORT' });
            if (t._connected) {
              console.warn('[SFU] connectTransport called twice for', transportId);
              return done({ connected: true });
            }
            await t.connect({ dtlsParameters });
            t._connected = true;
            done({ connected: true });
          } catch (err) {
            console.error('[SFU] connectTransport error', err);
            done({ error: 'CONNECT_FAILED' });
          }
        });
      } catch (e) {
        console.error('createTransport error', e);
        cb({ error: 'CREATE_TRANSPORT_FAILED' });
      }
    });

    // PRODUCE
    socket.on('produce', async ({ transportId, kind, rtpParameters }, cb) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return cb({ error: 'NO_ROOM' });
        const peer = ensurePeer(room, socket.id);
        const transport = [...peer.transports].find(t => t.id === transportId);
        if (!transport) return cb({ error: 'NO_TRANSPORT' });

        const producer = await transport.produce({ kind, rtpParameters });
        peer.producers.add(producer);
        producer.on('transportclose', () => { try { producer.close(); } catch {} });

        socket.to(roomId).emit('newProducer', {
          producerId: producer.id,
          kind: producer.kind,
          ownerPeerId: socket.id
        });

        cb({ id: producer.id });
      } catch (e) {
        console.error('produce error', e);
        cb({ error: 'PRODUCE_FAILED' });
      }
    });

    // CONSUME
    socket.on('consume', async ({ rtpCapabilities, producerId, transportId }, cb) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return cb({ error: 'NO_ROOM' });

        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
          return cb({ error: 'CANNOT_CONSUME' });
        }

        const peer = ensurePeer(room, socket.id);
        const transport = [...peer.transports].find(t => t.id === transportId);
        if (!transport) return cb({ error: 'NO_TRANSPORT' });

        let ownerPeerId = null;
        for (const [sid, p] of room.peers) {
          if ([...p.producers].some(prod => prod.id === producerId)) { ownerPeerId = sid; break; }
        }

        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: false
        });

        peer.consumers.add(consumer);
        consumer.on('transportclose', () => { try { consumer.close(); } catch {} });
        consumer.on('producerclose', () => {
          try { consumer.close(); } catch {}
          socket.emit('consumerClosed', { consumerId: consumer.id, producerId });
        });

        try { await consumer.resume(); } catch {}

        cb({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          producerPaused: consumer.producerPaused,
          ownerPeerId
        });
      } catch (e) {
        console.error('consume error', e);
        cb({ error: 'CONSUME_FAILED' });
      }
    });

    socket.on('resumeConsumer', async ({ consumerId }, cb) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return cb({ error: 'NO_ROOM' });
        const peer = ensurePeer(room, socket.id);
        const consumer = [...peer.consumers].find(c => c.id === consumerId);
        if (!consumer) return cb({ error: 'NO_CONSUMER' });
        await consumer.resume();
        cb({ ok: true });
      } catch (e) {
        cb({ error: 'RESUME_FAILED' });
      }
    });

    // MODERATION
    socket.on('moderate', async ({ action, targetPeerId }, cb = () => {}) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return cb({ error: 'NO_ROOM' });
        if (room.hostId && room.hostId !== socket.id) return cb({ error: 'NOT_HOST' });

        if (action === 'kick') {
          io.to(targetPeerId).emit('kicked');
          try { io.sockets.sockets.get(targetPeerId)?.disconnect(true); } catch {}
        } else if (action === 'stopVideo' || action === 'hardStop') {
          const peer = room.peers.get(targetPeerId);
          if (peer) for (const p of peer.producers) if (p.kind === 'video') try { p.close(); } catch {}
          io.to(targetPeerId).emit('videoStoppedByHost');
        } else if (action === 'mute') {
          const peer = room.peers.get(targetPeerId);
          if (peer) for (const p of peer.producers) if (p.kind === 'audio') try { p.pause(); } catch {}
          io.to(targetPeerId).emit('mutedByHost');
        }

        emitRoomState();
        cb({ ok: true });
      } catch (e) {
        console.error('moderate error', e);
        cb({ error: 'MODERATE_FAILED' });
      }
    });
  });

  return io;
}

module.exports = { initSfuSignaling };

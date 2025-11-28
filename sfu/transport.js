// sfu/transport.js
async function createWebRtcTransport(router, peer, listenIps = null) {
  const transport = await router.createWebRtcTransport({
    listenIps:
      listenIps ||
      [
        {
          ip: '0.0.0.0',
          announcedIp:
            process.env.ANNOUNCED_IP ||
            process.env.SFU_ANNOUNCED_IP ||
            '127.0.0.1'
        }
      ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1_000_000
  });

  peer.transports.add(transport);

  transport.on('dtlsstatechange', (state) => {
    if (state === 'closed') {
      try { transport.close(); } catch {}
    }
  });

  transport.observer.on('close', () => {
    try { peer.transports.delete(transport); } catch {}
  });

  return transport;
}

module.exports = { createWebRtcTransport };

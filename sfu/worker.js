const mediasoup = require('mediasoup');

let worker;

async function getWorker() {
  if (worker) return worker;

  worker = await mediasoup.createWorker({
    rtcMinPort: Number(process.env.SFU_RTC_MIN_PORT || 40000),
    rtcMaxPort: Number(process.env.SFU_RTC_MAX_PORT || 49999),
    logLevel: process.env.SFU_LOG_LEVEL || 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp']
  });

  worker.on('died', () => {
    console.error('[SFU] mediasoup worker died — exiting');
    process.exit(1);
  });

  console.log('[SFU] worker up');
  return worker;
}

module.exports = { getWorker };

const debug = require('debug')('key-value-server:->libs->redis');
const { createClient } = require('redis');
const { REDIS_USERNAME = 'default', REDIS_PASS, REDIS_HOST, REDIS_INDEX = 0 } = process.env;

const url = `rediss://${REDIS_USERNAME}:${REDIS_PASS}@${REDIS_HOST}/${REDIS_INDEX}`;
debug('redis url', url);

const client = createClient({ url, enable_offline_queue: false, });

client.on('error', (err) => {
  debug('client error', err);
  process.exit();
});

module.exports = client;

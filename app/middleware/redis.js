const fp = require('fastify-plugin');
// const debug = require('debug')('key-value-server:->middleware->redis');
const { redis } = require('../libs');

module.exports = fp((server, options, done) => {

  // debug(redis);
  server.decorate('redis', redis);

  done();

});

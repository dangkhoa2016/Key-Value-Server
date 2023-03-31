const fp = require('fastify-plugin');
// const debug = require('debug')('key-value-server:->middleware->check');
const { GuardMiddleware } = require('../libs');

module.exports = fp((server, options, done) => {

  const GuardMiddlewareX = new GuardMiddleware(server.redis);

  server.addHook('preHandler', async (request, reply) => {
    await GuardMiddlewareX.verify()(request, reply);
  });

  done();

});

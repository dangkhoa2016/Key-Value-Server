const fp = require('fastify-plugin');
const debug = require('debug')('key-value-server:->middleware->logger');
const requestIp = require('request-ip');
const { variables: { statusCodes }, } = require('../libs');

const now = () => Date.now();

const addRequestLog = (server) => {

  server.addHook('onRequest', (request, reply, next) => {
    reply.startTime = now();
    debug({
      info: 'received request', url: request.raw.url,
      method: request.method, id: request.id
    });
    next();
  });

  server.addHook('onResponse', (request, reply, next) => {
    debug(
      {
        info: 'response completed',
        url: request.raw.url, // add url to response as well for simple correlating
        statusCode: reply.raw.statusCode,
        durationMs: now() - reply.startTime, // recreate duration in ms - use process.hrtime() - https://nodejs.org/api/process.html#process_process_hrtime_bigint for most accuracy
      }
    );
    next();
  });

};

const handleUserIP = (request, reply) => {
  const userIP = /*request.headers['x-real-ip'] || */request.ip || requestIp.getClientIp(request);

  if (!userIP) {
    debug('preHandler: Must provide user IP address');
    reply.code(statusCodes.MUST_PROVIDE_USER_IP_ADDRESS).send();
    return;
  }

  request.userIP = userIP;
};

module.exports = fp((server, options, done) => {

  /*
  server.addHook('preSerialization', function (req, reply, done) {
    debug('preSerialization', reply);
  });
  */

  server.addHook('preHandler', (request, reply, next) => {
    reply.startTime = now();
    if (request.body)
      debug({ info: 'parse body', body: request.body });

    handleUserIP(request, reply);

    next();
  });

  addRequestLog(server);

  done();

});
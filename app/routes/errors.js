const debug = require('debug')('key-value-server:->routes->errors');
const fp = require('fastify-plugin');
const { variables: { statusCodes }, } = require('../libs');
const actions = [
  { decorate: 'notFound', code: statusCodes.NOT_FOUND, },
  { decorate: 'exception', code: statusCodes.INTERNAL_SERVER_ERROR, },
];

const addDecorate = (server) => {

  for (const action of actions) {
    server.decorate(action.decorate, (request, reply) => {
      debug(`decorate: ${action.decorate} url`, request.url);
      reply.code(action.code).send();
    });
  }

};

const addErrorHandle = (server) => {

  server.setErrorHandler((error, request, reply) => {
    debug('server.setErrorHandler', error, request.headers);
    if (error.validation) {
      reply.code(statusCodes.UNPROCESSABLE_ENTITY).send({ error: error.message });
      return;
    }

    server.exception(request, reply);
  });

  server.setNotFoundHandler(server.notFound);

};

module.exports = fp((server, options, done) => {

  addDecorate(server);

  server.get('/404', (request, reply, next) => {
    server.notFound(request, reply);
    next();
  });

  server.get('/500', (request, reply, next) => {
    server.exception(request, reply);
    next();
  });

  addErrorHandle(server);

  done();

});

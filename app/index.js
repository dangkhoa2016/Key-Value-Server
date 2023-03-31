const debug = require('debug')('key-value-server:->index');

// CommonJs
const server = require('fastify')({
  // disableRequestLogging: true,
  logger: false, pluginTimeout: 10000
});

server.register(require('./middleware/logger'));
server.register(require('./middleware/redis'));
server.register(require('./middleware/check'));

server.register(require('@fastify/cors'), {
  exposedHeaders: ['Content-Disposition'],
  allowedHeaders: ['authorization', 'content-type', 'location', 'retry-after'],
  origin: (origin, cb) => {
    // allow all
    cb(null, true);

    /* allow special host
    if (/localhost/.test(origin)) {
      //  Request from localhost will pass
      cb(null, true);
      return;
    }
    // Generate an error on other origins, disabling access
    cb(new Error("Not allowed"));
    */ 
  }
});

server.register(require('./routes/errors'));
server.register(require('./routes/home'));
server.register(require('./routes/key_values'));

debug(`Started at: ${new Date()}`);
module.exports = server;

const debug = require('debug')('key-value-server:->routes->key_values');
const { variables: { statusCodes }, } = require('../libs');
const { helpers: replitHelpers } = require('../libs/quick.replit.mod/index');
const updateActions = ['post', 'put', 'patch'];
const deleteActionCodes = {
  deleteKey: statusCodes.NOT_FOUND,
  bulkRemoveKeys: statusCodes.UNPROCESSABLE_ENTITY,
};

const tokenQuerySchema = {
  type: 'object',
  properties: {
    auth_token: { type: 'string' },
  },
};

const baseQuerySchema = {
  type: 'object',
  properties: {
    ...tokenQuerySchema.properties,
    limit: { type: 'integer' },
    offset: { type: 'integer' },
    sort_field: { type: 'string' },
    sort_direction: { type: 'string' },
  },
};

const bulkDeleteParamSchema = {
  type: 'array',
  items: { type: 'number' }
};

const paramSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
};

const searchQuerySchema = {
  type: 'object',
  properties: {
    ...baseQuerySchema.properties,
    prefix: { type: 'string' },
  },
};

const getKey = async (request, reply) => {
  const { id: key } = request.params;
  debug('getKey', key);
  const { code, message } = await replitHelpers.getKey(key);
  reply.code(code).send(message || undefined);
};

const isValidCreateKey = (key, id, reply) => {
  if (key && id) {
    reply.code(statusCodes.UNPROCESSABLE_ENTITY).send('Please supply key in only [params] or [body].');
    return false;
  }

  if (!key && !id) {
    reply.code(statusCodes.UNPROCESSABLE_ENTITY).send('Please supply key in [params] or [body].');
    return false;
  }

  return true;
};

const createKey = async (request, reply) => {
  const { id } = request.params;
  let { key, value, expirationTtl, expiration, } = request.body;

  if (!isValidCreateKey(key, id, reply))
    return;

  key = key || id;
  debug('createKey', key, value, expirationTtl, expiration);
  const result = await replitHelpers.saveKey({ key, value, expirationTtl, expiration, });
  reply.code(result ? statusCodes.OK : statusCodes.NO_CONTENT).send();
};

const handleAction = (action) => {
  return async (request, reply) => {
    let params = null;
    switch (action) {
      case 'removeKey':
        params = request.params.id;
        break;
      default:
        params = request.body || [];
        break;
    }

    const result = await replitHelpers[action](params);

    reply.code(result ? statusCodes.NO_CONTENT : deleteActionCodes[action]).send();
  };
};

const addCreateKeyRoute = (fastify) => {

  fastify.post('/', { schema: { body: { $ref: 'keySchema#' }, querystring: tokenQuerySchema } }, createKey);

  const updateDataOptions = { schema: { params: paramSchema, querystring: tokenQuerySchema } };
  updateActions.forEach(action => {
    fastify[action]('/:id', updateDataOptions, createKey);
  });

};

const addDeleteKeyRoute = (fastify) => {

  fastify.get('/:id/delete', { schema: { params: paramSchema, querystring: tokenQuerySchema } }, handleAction('removeKey'));
  fastify.delete('/:id', { schema: { params: paramSchema, querystring: tokenQuerySchema } }, handleAction('removeKey'));
  fastify.post('/bulk_delete', { schema: { body: bulkDeleteParamSchema, querystring: tokenQuerySchema } }, handleAction('bulkRemoveKeys'));

};

const handleBuffer = (buf, format, reply) => {
  if (!buf) {
    reply.code(statusCodes.NO_CONTENT).send();
    return;
  }

  const fileName = `export-key-value-${(new Date()).valueOf()}.${format.toLowerCase()}`;
  reply.header('Content-Disposition', `attachment; filename=${fileName}`);
  reply.type('application/json');

  reply.send(buf);
}

const addImportExportRoute = (fastify) => {

  fastify.get('/export', async (request, reply) => {
    const { format = 'json', prefix = '' } = request.query;
    let buf = null;

    try {
      buf = await replitHelpers.export(prefix, format);
    } catch (error) {
      debug('/export Error', error);
      reply.code(statusCodes.INTERNAL_SERVER_ERROR).send();
      return;
    }

    handleBuffer(buf, format, reply);
  });

  fastify.post('/import', async (request, reply) => {
    let { url, auth_token } = request.body;
    if (!url || typeof (url) !== 'string') {
      fastify.notFound(request, reply);
      return;
    }

    if (!auth_token) auth_token = request.query.auth_token;
    const { code, message, error } = await replitHelpers.import(url, auth_token.trim());
    debug('import: result', code, message, error);
    reply.code(code).send(code === statusCodes.INTERNAL_SERVER_ERROR ? message : undefined);
  });

};

const routes = (fastify, options, done) => {

  fastify.get('/', (/*request, reply*/) => {
    return 'Welcome !!!'
  });

  fastify.addSchema({
    $id: 'keySchema',
    type: 'object',
    properties: {
      key: { type: 'string' },
      value: {},
      expired: { type: ['string', 'number', 'null'] },
    },
  });

  fastify.get('/search', { schema: { querystring: searchQuerySchema } }, async (request, reply) => {
    const { prefix = '', } = request.query;
    debug('/search', prefix);
    const { code, message } = await replitHelpers.listAll(prefix);
    reply.code(code).send(message || undefined);
  });

  addCreateKeyRoute(fastify);
  addDeleteKeyRoute(fastify);
  addImportExportRoute(fastify);

  fastify.get('/:id', { schema: { params: paramSchema, querystring: tokenQuerySchema } }, getKey);
  done();

}

module.exports = routes;

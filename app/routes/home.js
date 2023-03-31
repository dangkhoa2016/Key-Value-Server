// const debug = require('debug')('key-value-server:->routes->home');
const fs = require('fs');
const path = require('path');

const getIconData = async (extension) => {
  if (!extension)
    return [];

  const buffer = await fs.readFileSync(path.join(process.cwd(), `./app/imgs/favicon.${extension}`));
  let mime = extension.toLowerCase();
  if (mime === 'icon')
    mime = 'x-icon';
  return [mime, buffer];
};

const routes = (fastify, options, done) => {

  for (const extension of ['ico', 'png']) {
    fastify.get(`/favicon.${extension}`, async (request, reply) => {
      const [mime, buffer] = await getIconData(extension);
      reply.type(`image/${mime}`).send(buffer);
    });
  }

  done();

}

module.exports = routes;

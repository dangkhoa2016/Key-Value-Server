const timeHelper = require('./time_helpers');
const debug = require('debug')('key-value-server:->libs->guard_middleware');
const _includes = require('lodash.includes');
const { mustExcludes, statusCodes } = require('./variables');
const masterCrypto = require('./master_crypto');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const prefix = 'key-value-server';
const maxConsecutiveFailsByIP = 5;

const getToken = (req) => {
  const bearer = req.headers.authorization || ' ';
  const token = bearer.split(' ')[1];
  return token || req.query.auth_token;
};

const decodePassword = async (req) => {
  const token = getToken(req);
  debug('decodePassword: token', token);

  let payload = null;
  if (!token)
    return payload;

  try {
    payload = await masterCrypto.decrypt(token);
  } catch (errx) {
    debug('decodePassword: masterCrypto.decrypt Error', errx);
  }

  return payload;
};

class GuardMiddleware {
  constructor(redisClient) {
    this.limiterConsecutiveFailsByIP = new RateLimiterRedis({
      redis: redisClient,
      keyPrefix: `${prefix}:login_fail_consecutive_ip`,
      points: maxConsecutiveFailsByIP,
      duration: 60 * 60 * 10, // Store number for 10 hours since first fail
      blockDuration: 60 * 60 * 5, // Block for 5 hours
    });
    this.rlResUsername = null;
  }

  async handleInvalid(clientIp, reply) {
    try {
      await this.limiterConsecutiveFailsByIP.consume(clientIp);
      if (this.rlResUsername) {
        const remain = this.rlResUsername.remainingPoints;
        reply.header('Remain', remain);
        debug('handleInvalid: remain try', remain);
      }

      reply.code(statusCodes.INVALID_AUTH_TOKEN).send();
    } catch (rlRejected) {
      if (rlRejected instanceof Error)
        throw rlRejected;

      const retrySecs = Math.round(rlRejected.msBeforeNext / 1000) || 1;
      reply.header('Retry-After', retrySecs);
      reply.status(statusCodes.INVALID_REQUEST_SO_MANY_TIMES).send({
        humanReadable: timeHelper.formatHumanReadable(retrySecs)
      });
    }
  }

  async checkAlreadyBlock(clientIp, reply) {
    this.rlResUsername = await this.limiterConsecutiveFailsByIP.get(clientIp);
    debug('checkAlreadyBlock: rlResUsername', this.rlResUsername, clientIp);
    if (this.rlResUsername !== null && this.rlResUsername.consumedPoints > maxConsecutiveFailsByIP) {
      const retrySecs = Math.round(this.rlResUsername.msBeforeNext / 1000) || 1;
      debug(`checkAlreadyBlock: IP [${clientIp}] already block, wait for ${retrySecs}`);
      reply.header('Retry-After', retrySecs);
      reply.status(statusCodes.INVALID_REQUEST_SO_MANY_TIMES).send({
        humanReadable: timeHelper.formatHumanReadable(retrySecs)
      });
      return true;
    }

    return false;
  }

  verify() {
    const gm = this;

    return async (req, reply) => {
      debug('verify', req.url, req.params);
      const url = (req.routerPath || req.url).substring(1).toLowerCase();
      if (!url || _includes(mustExcludes, url))
        return;

      // debug('verify: headers', req.headers);

      const clientIp = req.userIP;

      if (await gm.checkAlreadyBlock(clientIp, reply))
        return;

      const payload = await decodePassword(req);
      debug('payload', payload);

      if (payload === process.env.SECRET) {
        if (gm.rlResUsername !== null && gm.rlResUsername.consumedPoints > 0) {
          debug('verify: Reset on successful authorisation');
          await gm.limiterConsecutiveFailsByIP.delete(clientIp);
        }

        return;
      }

      await gm.handleInvalid(clientIp, reply);
    }
  }
}

module.exports = GuardMiddleware;

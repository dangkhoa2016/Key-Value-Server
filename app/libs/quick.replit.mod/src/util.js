// const _ = require('../../lodash.custom');
const debug = require('debug')('key-value-server:->quick.replit.mod->util');

class Util {

  static doOperation = function (operator, params, ops) {
    const { key, data, value } = params;
    switch (operator) {
      case 'add':
      case 'plus':
      case '+':
        return this.set(key, data + value, ops);
      case 'subtract':
      case 'sub':
      case '-':
        return this.set(key, data - value, ops);
      case 'multiply':
      case 'mul':
      case '*':
        return this.set(key, data * value, ops);
      case 'divide':
      case 'div':
      case '/':
        return this.set(key, data / value, ops);
      default:
        throw new Error('Unknown operator provided!');
    }
  }

  static corePing = async function (action) {
    const start = Date.now();
    if (action === 'set')
      await this[action]('LQ==', Buffer.from(start.toString()).toString('base64'));
    else
      await this[action]('LQ==');
    return Date.now() - start;
  }
  
  static parseBody = function (body) {
    if (!body)
      return body;
  
    let value = body;
    try {
      value = JSON.parse(value);
      this.emit('debug', 'fetch: json parsed', value);
    } catch (_err) {
      return body;
    }
  
    return value;
  }
  
  static import(data = [], ops = {}) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(data)) {
        reject(new Error(
          `Data type must be Array, received ${typeof (data)}!`,
          'DataTypeError'
        ));
        return;
      }

      if (data.length < 1)
        resolve(false);

      data.forEach((x, i) => {
        if (!x.ID || !x.data) {
          reject(new Error(
            `Data is missing [${!x.ID ? 'ID' : 'data'}] field!`,
            'DataImportError'
          ));
          return;
        }

        setTimeout(() => { this.set(x.ID, x.data, ops); }, 150 * (i + 1));
      });

      resolve(true);
    });
  }

  /**
 * Will return true if the key provided is a string
 * @param str Anything to test
 * @return {Boolean}
 */
  static isKey(str) {
    return typeof (str) === 'string';
  }

  static getMessages(action, key, value) {
    let doing = '';
    let sentence = '';
    switch (action) {
      case 'delete':
        doing = 'deleting';
        sentence = `${doing} ${key}`;
        break;
      case 'fetch':
        doing = 'fetching';
        sentence = `${doing} ${key}`;
        break;
      case 'set':
        doing = 'saving';
        sentence = `${doing} ${key} while setting ${value}`
        break;
      default:
        doing = 'fetching'
        sentence = 'listing all the keys';
        break;
    }
    return [doing, sentence];
  }

  static async baseHandle429(status, action, key, value, ops) {
    if (status !== 429)
      return;

    const [doing, sentence] = Util.getMessages(action, key, value);

    if (this.tries === 0) {
      this.tries = 3;
      this.emit(
        'error',
        `Quick.Replit encountered 429 error code on ${sentence}, Quick.Replit re-tried for 3 times but still failed at ${doing}, you will have to run the function again after some time`
      );
      return;
    }

    this.emit(
      'error',
      `Quick.Replit encountered 429 error code on ${sentence}, Quick.Replit will retry for 3 more times if it fails you will have to run the function again after some time`
    );

    ops[action] = true;
    await Util._handle429.call(this, key, value, ops);
  }

  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
  * Handles 429
  * @ignore
  * @private
  * @return {Promise<boolean>}
  */
  static async _handle429(key, value, ops = {}) {
    this.tries--;

    ops = Util.normalizeSleepOption(ops);
    debug('_handle429: sleep', ops.sleep);

    await Util.sleep(ops.sleep);

    if (ops.set)
      return this.set(key, value, ops);

    for (const action of ['fetch', 'delete', 'listall']) {
      if (ops[action]) {
        debug(`_handle429: retry ${action}: ${key}`);
        return this[action](key, ops);
      }
    }

    return null;
  }

  static normalizeSleepOption(ops) {
    if (!ops)
      ops = {};
    let sleep = Number(ops.sleep) || 0;
    if (sleep < 1) sleep = 3500;
    ops.sleep = sleep;
    return ops;
  }

  /**
 * Will return true if the key is not Infinity
 * @param data Any data
 * @return {Boolean}
 */
  static isValue(data) {
    if (data === Infinity || data === -Infinity) return false;
    if (typeof (data) === 'undefined') return false;
    return true;
  }

  /**
 * Sort data
 * @param {string} key Key
 * @param {Array} data Data
 * @param {object} ops options
 */
  // static sort(key, data, ops) {
  //   if (!key || !data || !Array.isArray(data)) return [];
  //   let arb = data.filter((i) => i.ID.startsWith(key));
  //   console.log('arb', JSON.stringify(arb));
  //   if (ops.sort && typeof(ops.sort) === 'string') {
  //     if (ops.sort.startsWith('.')) ops.sort = ops.sort.slice(1);
  //     ops.sort = ops.sort.split('.');
  //     console.log('ops.sort', ops.sort);
  //     arb = _.sortBy(arb, ops.sort);
  //     if (ops.reverse)
  //       arb = arb.reverse();
  //     console.log('arb', JSON.stringify(arb));
  //   }
  //   return arb;
  // }
}

module.exports = Util;

const Database = require('./src/database');
const debug = require('debug')('key-value-server:->libs->quick.replit.mod->helpers');
const axiosHelpers = require('../axios_helpers');
const moment = require('moment');
const namespace = 'key-value-server';
const { jsonToZip, jsonToCSV, streamToString, parseDate, } = require('../helpers');
const axios = require('axios');
const expirationPrefix = 'exp';
const nonExpirationPrefix = 'nexp';
const { statusCodes, } = require('../variables');
const Promise = require('bluebird');

const getExpiredDateValue = (expirationTime) => {
  if (!expirationTime)
    return null;

  const parsedDate = parseDate(expirationTime);
  if (!parsedDate)
    return null;

  if (parsedDate <= moment()) {
    debug(`getExpiredDateValue: time [${parsedDate.toDate()} is in the past, can not use.`);
    return null;
  } else
    return parsedDate.valueOf();
};

const getExpired = (expirationTtl, expiration) => {
  let expired = getExpiredDateValue(expiration);
  if (!expired && expirationTtl) {
    expirationTtl = Number(expirationTtl) || 0;
    if (expirationTtl > 0)
      expired = moment().add(expirationTtl, 'seconds').toDate();
  }
  return expired;
};

class ReplHelpers {
  constructor() {
    this.db = new Database();
    this.db.on('debug', (action, key, value) => {
      debug('REPL DB debug', { action, key, value });
    });
  }

  async getKey(key) {
    if (!key)
      return null;

    let result = await this.internalGetKey(key, nonExpirationPrefix);
    debug('getKey nonExpirationPrefix', key, result);
    let { code, value } = (result || {});
    if (code === statusCodes.NOT_FOUND) {
      result = (await this.internalGetKey(key, expirationPrefix)) || {};
      debug('getKey expirationPrefix', key, result);
      code = result.code;
      value = result.value;
    }

    const temp = await this.extractValue(key, value);

    return { code, message: temp && temp.value };
  }

  async extractValue(key, json = {}, includeExpirationTime = false) {
    let { expired = null, x } = json || {};
    if (expired) {
      if (moment(expired) < moment()) {
        x = null;
        debug(`extractValue: ${key} is expired at [${moment(expired).toDate()}]`);
        await this.removeKey(key);
        return null;
      }
    }

    const result = { key, value: x };
    if (includeExpirationTime)
      result.expired = expired;
    return result;
  }

  async internalGetKey(key, prefix) {
    try {
      const value = await this.db.fetch(`${namespace}:${prefix}:${key}`);
      debug('internalGetKey: value', value);
      return { code: statusCodes.OK, value };
    } catch (err) {
      debug('internalGetKey: Error', key);
      axiosHelpers(err);

      const { response = {} } = (err || {});
      return { code: response.status, value: null };
    }
  }

  async saveKey({ key, value, expirationTtl, expiration, }) {
    if (!key)
      return false;

    const expired = getExpired(expirationTtl, expiration);
    value = { x: value, expired };

    try {
      // debug('saveKey', key, value);
      key = `${namespace}:${expired ? expirationPrefix : nonExpirationPrefix}:${key}`;
      await this.db.set(key, value);
      return true;
    } catch (err) {
      debug('saveKey: Error', key, value);
      axiosHelpers(err);
      return false;
    }
  }

  async bulkRemoveKeys(keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
      debug('bulkRemoveKeys: not provide keys');
      return false;
    }

    await Promise.map(keys, async key => {
      try {
        await this.removeKey(key);
      } catch (error) {
        debug('bulkRemoveKeys: Error', error);
      }
    }, { concurrency: 2 });

    return true;
  }

  async removeKey(key) {
    try {
      await this.removeKeyByType(expirationPrefix, key);
      await this.removeKeyByType(nonExpirationPrefix, key);

      return true;
    } catch (err) {
      // debug('removeKey: Error', key);
      axiosHelpers(err);
      return false;
    }
  }

  async removeKeyByType(type, key) {
    if (!type)
      return false;

    try {
      const result = await this.db.delete(`${namespace}:${type}:${key}`);
      debug(`removeKeyByType ${type}`, key, result);
      return true;
    } catch (err) {
      const { response = {} } = (err || {});
      if (response.status === statusCodes.NOT_FOUND) {
        debug(`removeKeyByType ${type}: [${key}] not found`);
        return true;
      }

      debug(`removeKeyByType ${type}: Error`, key);
      axiosHelpers(err);
      return false;
    }
  }

  async extractByType(type, prefix = '', includeExpirationTime = false) {
    if (!type)
      return [];

    const result = await this.db.all(`${namespace}:${type}:${prefix}`);
    debug(`extractByType ${type}`, prefix, result);
    return Promise.map(result, item => {
      return this.extractValue(item.ID.replace(`${namespace}:${type}:`, ''),
        item.data, includeExpirationTime);
    }, { concurrency: 2 }).filter(f => f);
  }

  async listAll(prefix = '', includeExpirationTime = false) {
    try {
      let arr = [];

      let result = await this.extractByType(expirationPrefix, prefix, includeExpirationTime);
      arr = arr.concat(result);
      result = await this.extractByType(nonExpirationPrefix, prefix, includeExpirationTime);

      return { code: statusCodes.OK, message: arr.concat(result) };
    } catch (err) {
      debug('listAll: Error', err);
      axiosHelpers(err);

      return { code: statusCodes.INTERNAL_SERVER_ERROR, message: err.message };
    }
  }


  async export(prefix = '', export_type = 'json') {
    let { /*code, */message: arr = [] } = await this.listAll(prefix, true);

    if (arr.length === 0) {
      debug('export: No key-values for export.');
      return null;
    }

    switch (export_type.toLowerCase()) {
      case 'zip':
        arr = jsonToZip('KeyValue', arr);
        break;
      case 'csv':
        arr = jsonToCSV(arr);
        break;
      default:
        break;
    }

    debug('export', export_type, arr);

    switch (export_type.toLowerCase()) {
      case 'zip':
        return arr.toBuffer();
      case 'csv':
        return Buffer.from(arr.join('\n'));
      default:
        return Buffer.from(JSON.stringify(arr));
    }
  }

  async importData(data) {
    debug('importData: json data', data);

    if (!Array.isArray(data) || data.length === 0) {
      debug('importData: Nothing to import');
      return { code: statusCodes.NOTHING_TO_IMPORT };
    }

    const arr = await Promise.map(data, async row => {
      const { key, value, expired } = row || {};
      const result = await this.saveKey(key, value, expired);
      debug('importData: saveKey result', result);
      return result;
    }, { concurrency: 1 }).filter(f => f);

    debug(`importData: Imported ${arr.length} key-value`);
    return { code: statusCodes.OK, message: arr.length };
  }

  async import(url, auth_token) {
    if (!url || typeof (url) !== 'string' || !url.toLowerCase().startsWith('http')) {
      debug('import: Empty url');
      return { code: statusCodes.UNPROCESSABLE_ENTITY };
    }

    const sym = url.includes('?') ? '&' : '?';
    url = `${url}${sym}auth_token=${auth_token}`;

    try {
      let { data } = (await axios.get(url, { responseType: 'stream' })) || {};

      data = await streamToString(data);
      if (data) data = JSON.parse(data);

      return await this.importData(data);
    } catch (error) {
      debug('import: Error load json data');
      axiosHelpers(error);
      return { code: statusCodes.INTERNAL_SERVER_ERROR, error: error.message };
    }
  }

  setDbURL(url) {
    this.db.url = url;
  }

}

module.exports = new ReplHelpers();

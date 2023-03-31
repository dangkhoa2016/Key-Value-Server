const Util = require('./util');
const fetch = require('axios');
const { EventEmitter } = require('events');
const Promise = require('bluebird');
const debug = require('debug')('key-value-server:->quick.replit.mod->database');
const aliasActions = {
  write: 'set', fetch: 'get', has: 'exists', typeof: 'type'
};
const mathActions = {
  add: '+', plus: '+',
  subtract: '-', sub: '-',
  multiply: '*', mul: '*',
  divide: '/', div: '/',
};
const pingMethods = {
  _write: 'set', _read: 'get', _delete: 'delete'
};

const baseFetch = async (url, key, skipThrowError = false) => {
  try {
    return await fetch({ responseType: 'arraybuffer', url: `${url}/${encodeURIComponent(key)}` });
  } catch (err) {
    debug('baseFetch Error', err);
    if (skipThrowError)
      return err;
    else
      throw err;
  }
};

/**
 * quick.replit -
 * Modified by vuca89.
 */
class Database extends EventEmitter {
  /**
 * Inititates the quick.replit instance!
 * @param {string} dbURL Replit database URL.
 * @example const { Database } = require("quick.replit");
 * const db = new Database("url");
 */
  constructor(dbURL) {
    super();
    if (dbURL) this.url = dbURL;
    else this.url = process.env.REPLIT_DB_URL;
    if (!this.url) throw new Error('An URL was not provied/obtained!', 'URLError');

    this.readyAt = new Date();
    this.tries = 3;
    this.validStatusCodes = [200, 204, 404];
    setTimeout(() => this.emit('ready'), 0);
  }

  /**
 * Sets a value to the specified key on the database!
 * @param {string} key The key to set.
 * @param value The value to set on the key.
 * @param {object} [ops={}] Set options.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Boolean>}
 * @example await db.set("foo", "bar").then(() => console.log("Saved data"));
 */
  async set(key, value, ops = {}) {
    if (!Util.isKey(key)) throw new Error('Invalid key provided!', 'KeyError');
    if (!Util.isValue(value)) throw new Error('Invalid value provided!', 'ValueError');

    this.emit('debug', 'set', key, value);
    const body = await fetch({
      url: this.url, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`,
    });

    if (body.status !== 200) {
      throw new Error(
        'The Replit Database URL is invalid! No data was found.',
        'ReplitDBError'
      );
    }

    await Util.baseHandle429.call(this, body.status, 'set', key, value, ops);

    if (body.status === 200) {
      this.tries = 3;
      return true;
    }

    return null;
  }

  /**
 * Set's the value in each element of array to the key in each element of array!
 * @param {Array} items The Data Array.
 * @param {object} [ops={}] Set options.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<any[]>}
 * @example const data = [
 * { key: "test_1", value: "hello1" },
 * { key: "test_2", value: "hello2" },
 * { key: "test_3", value: "hello3" },
 * { key: "test_4", value: "hello4" },
 * { key: "test_5", value: "hello5" },
 * { key: "test_6", value: "hello6" },
 * { key: "test_7", value: "hello7" },
 * { key: "test_8", value: "hello8" },
 * { key: "test_9", value: "hello9" }
 * ];
 * await db.setMany(data)
 */
  async setMany(items = [], ops = {}) {
    if (!Array.isArray(items)) throw new Error('Items must be an Array!', 'ValueError');

    const cleaned = items.filter(
      (item) => item.key && typeof (item.key) === 'string'
    );

    await Promise.map(cleaned, clean => this.set(clean.key, clean.value, ops));

    return cleaned;
  }

  /**
 * Deletes a key from the database!
 * @param {string} key The key to set.
 * @param {object} [ops={}] Delete options.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Boolean>}
 * @example db.delete("foo").then(() => console.log("Deleted data"));
 */
  async delete(key, ops = {}) {
    if (!Util.isKey(key)) throw new Error('Invalid key provided!', 'KeyError');

    this.emit('debug', 'delete', key);

    const body = await fetch({ url: `${this.url}/${encodeURIComponent(key)}`, method: 'DELETE', });

    await Util.baseHandle429.call(this, body.status, 'delete', key, null, ops);

    if (!this.validStatusCodes.includes(body.status))
      return false;

    if (this.tries !== 3) this.tries = 3;

    return true;
  }

  /**
 * Fetches the value stored on the key from database!
 * @param {string} key The key to set.
 * @param {object} [ops={}] Get options.
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<any>}
 * @example await db.get("foo").then(console.log);
 */
  async get(key, ops = {}) {
    if (!Util.isKey(key)) throw new Error('Invalid key provided!', 'KeyError');
    if (typeof (ops.raw) !== 'boolean') ops.raw = false;

    this.emit('debug', 'get', key);

    let body = await baseFetch(this.url, key, ops.skipThrowError);

    await Util.baseHandle429.call(this, body.status, 'get', key, null, ops);

    if (!this.validStatusCodes.includes(body.status))
      return null;

    if (this.tries !== 3) this.tries = 3;

    const buffer = Buffer.from(body.data, 'binary');
    body = buffer.toString();
    this.emit('debug', 'get: raw', body);
    body = decodeURIComponent(body);
    this.emit('debug', 'get: decodeURIComponent', body);

    if (ops.raw)
      return body;
    else
      return Util.parseBody.call(this, body);
  }

  /**
 * Checks if there is a data stored with the given key!
 * @param {string} key Key
 * @param {object} [ops={}] Exists options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Boolean>}
 * @example await db.exists("foo").then(console.log);
 */
  async exists(key, ops = {}) {
    if (!Util.isKey(key)) throw new Error('Invalid key specified!', 'KeyError');
    const result = await this.get(key, ops);
    return Boolean(result);
  }

  /**
 * Returns everything from the database
 * @param {object} [ops={}] All options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @param {number} [ops.limit=0] Fetch data only upto the specified limit (0 = Unlimited).
 * @return {Promise<Array>}
 * @example let data = await db.all();
 * console.log(`There are total ${data.length} entries.`);
 */
  async all(prefix = '', ops = {}) {
    let limit = Number(ops.limit) || 0;
    if (!limit || limit < 1) limit = 0;

    let output = [];
    const keys = await this.listall(prefix, ops);
    output = await Promise.map(keys, async key => ({ ID: key, data: await this.get(key, ops) }));

    if (limit) output = output.slice(0, limit);
    return output;
  }

  /**
 * Returns raw data object from the database {key: value}!
 * @param {object} [ops={}] Raw options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @param {number} [ops.limit=0] Fetch data only upto the specified limit (0 = Unlimited).
 * @return {Promise<Object>}
 * @example await db.raw().then(console.log);
 */
  async raw(prefix = '', ops = {}) {
    let limit = Number(ops.limit) || 0;
    if (!limit || limit < 1) limit = 0;

    let all = await this.all(prefix, { ...ops, raw: true });
    if (all.length > 0 && limit) all = all.slice(0, limit);
    debug('raw all', all);
    const output = {};
    for (const item of all)
      output[item.ID] = item.data;

    return output;
  }

  /**
 * Returns all of the key's from the database!
 * @param {string} [prefix=""] The prefix to listall keys from.
 * @param {object} [ops={}] TypeOf options
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Array>}
 * @example await db.listall().then(console.log);
 */
  async listall(prefix = '', ops = {}) {
    this.emit('debug', 'listall', 'Listing all the keys from the database...', prefix);
    let body = await fetch({ url: `${this.url}?encode=true&prefix=${encodeURIComponent(prefix)}` });

    debug('listall', prefix);

    await Util.baseHandle429.call(this, body.status, 'listall', prefix, null, ops);

    if (this.tries !== 3) this.tries = 3;

    body = body.data;
    if (body.length === 0)
      return [];

    return body.split('\n').map(decodeURIComponent);
  }

  /**
 * Does a math calculation and stores the value in the database!
 * @param {string} key Data key
 * @param {string} operator One of +, -, * or /
 * @param {number} value The value, must be a number
 * @param {object} [ops={}] Math options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Boolean>}
 * @example db.math("items", "+", 200).then(() => console.log("Added 200 items"));
 */
  async math(key, operator, value, ops = {}) {
    if (!Util.isKey(key)) throw new Error('Invalid key specified!', 'KeyError');
    if (!operator) throw new Error('No operator provided!');
    if (!Util.isValue(value)) throw new Error('Invalid value specified!', 'ValueError');

    debug('math', key, operator, value, ops);
    const data = (await this.get(key, ops));
    if (!data)
      return this.set(key, value, ops);

    if (typeof (data) !== 'number')
      throw new Error('Target is not a number!');

    return Util.doOperation.call(this, operator, { key, data, value }, ops);
  }

  /**
 * Fetches everything from the database and sorts by given target!
 * @param {string} key Key
 * @param {object} [ops={}] StartsWith options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @param {number} [ops.limit=0] Fetch data only upto the specified limit (0 = Unlimited).
 * @return {Promise<Array>}
 * @example const data = await db.startsWith("money", { sort: ".data" });
 */
  // async startsWith(key, ops = {}) {
  //   if (!key || typeof(key) !== 'string') {
  //     throw new Error(
  //       `Expected key to be a string, but received a ${typeof(key)}`
  //     );
  //   }
  //   const all = await this.all('', ops);
  //   return Util.sort(key, all, ops);
  // }

  /**
 * Pushe's the specific value into an array to the key in the database!
 * @param {string} key Key
 * @param {string} value Value
 * @param {object} [ops={}] Push options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Boolean>}
 * @example const data = await db.push("foo", "bar");
 */
  async push(key, value, ops = {}) {
    if (!Util.isKey(key)) throw new Error('Invalid key provided!', 'KeyError');
    if (!Util.isValue(value)) throw new Error('Invalid value provided!', 'ValueError');

    this.emit('debug', 'push', key, value);
    const data = await this.get(key, ops);
    if (!data)
      return this.set(key, [value], ops);

    if (!Array.isArray(data))
      throw new Error('Data is not an Array!', 'ValueError');

    data.push(value);
    return this.set(key, data, ops);
  }

  /**
 * Pull's the specific value from an array to the key in the database!
 * @param {string} key Key
 * @param {string} value Value
 * @param {object} [ops={}] Pull options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Boolean>}
 * @example const data = await db.pull("foo", "bar");
 */
  async pull(key, value, ops = {}) {
    if (!Util.isKey(key)) throw new Error('Invalid key provided!', 'KeyError');
    if (!Util.isValue(value)) throw new Error('Invalid value provided!', 'ValueError');

    this.emit('debug', 'pull', key, value);
    const oldData = await this.get(key, ops);
    if (!Array.isArray(oldData)) throw new Error('Data is not an Array!', 'ValueError');

    let newData = null;
    if (Array.isArray(value))
      newData = oldData.filter((d) => !value.includes(d));
    else
      newData = oldData.filter((d) => d !== value);

    return this.set(key, newData, ops);
  }

  /**
 * Return's the value type of the key!
 * @param {string} key key
 * @param {object} [ops={}] Type options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @example console.log(await db.type("foo"));
 * @return {Promise<"string" | "number" | "bigint" | 'boolean' | "symbol" | "undefined" | "object" | "function" | "array">}
 */
  async type(key, ops) {
    if (!Util.isKey(key)) throw new Error('Invalid Key!', 'KeyError');
    const fetched = await this.get(key, ops);
    if (Array.isArray(fetched)) return 'array';
    return typeof (fetched);
  }

  /**
 * Delete's all of the data from the database!
 * @param {object} [ops={}] Clear options
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @return {Promise<Boolean>}
 * @example const data = await db.clear();
 */
  async clear(prefix = '', ops = {}) {
    this.emit('debug', 'clear', 'Deleting everything from the database...', prefix);

    const keys = await this.listall(prefix, ops);
    if (Array.isArray(keys))
      await Promise.map(keys, key => this.delete(key, ops));

    return true;
  }

  /**
  * Delete's all of the data from the database! (similar to the clear method)
  * @param {object} [ops={}] DeleteAll options
  * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
  * @return {Promise<Boolean>}
  * @example const data = await db.deleteAll();
  */
  deleteAll(ops = {}) {
    this.emit('debug', 'deleteAll', 'Deleting everything from the database...');
    return this.clear(ops);
  }

  /**
  * Import's the specific data from another database into replit database!
  * @param {Array} data Data
  * @param {object} [ops={}] Import options
  * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
  * @return {Promise<Boolean>}
  * @example const data = QuickDB.all();
  * db.import(data);
  */
  import(data = [], ops = {}) {
    return Util.import.call(this, data, ops);
  }

  /**
 * Export's all of the data from the database to quick.db!
 * @param {any} quickdb Quick.db instance
 * @param {object} [ops={}] export options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @param {number} [ops.limit=0] Fetch data only upto the specified limit (0 = Unlimited).
 * @return {Promise<any[]>}
 * @example const data = await db.exportToQuickDB(quickdb);
 */
  async exportToQuickDB(quickdb, ops = {}) {
    if (!quickdb) throw new Error('Quick.db instance was not provided!');

    this.emit('debug', 'exportToQuickDB', 'Exporting all data from the database to quick.db...');
    const data = await this.all('', ops);
    data.forEach(item => {
      quickdb.set(item.ID, item.data);
    });

    return quickdb.all();
  }

  /**
 * Export's all of the data from the database to quickmongo!
 * @param {any} quickmongo QuickMongo instance
 * @param {object} [ops={}] export options
 * @param {boolean} [ops.raw=false] If set to true, it will return the raw un-parsed data.
 * @param {number} [ops.sleep=3500] Alter the time to sleep for if the response code is 429.
 * @param {number} [ops.limit=0] Fetch data only upto the specified limit (0 = Unlimited).
 * @return {Promise<any[]>}
 * @example const data = await db.exportToQuickMongo(quickmongo);
 */
  async exportToQuickMongo(quickmongo, ops = {}) {
    if (!quickmongo) throw new Error('Quick Mongo instance was not provided!');
    this.emit('debug', 'exportToQuickMongo', 'Exporting all data from the database to quickmongo...');
    const data = await this.all('', ops);
    await Promise.map(data, item => quickmongo.set(item.ID, item.data));

    return quickmongo.all();
  }
}

/**
 * Emitted when database creates connection
 * @event Database#ready
 * @example db.on("ready", () => {
 *     console.log("Successfully connected to the database!");
 * });
 */

/**
 * Emitted when database encounters error
 * @event Database#error
 * @param {Error} Error Error Message
 * @example db.on("error", console.error);
 */

/**
 * Emitted on debug mode
 * @event Database#debug
 * @param {string} Message Debug message
 * @example db.on("debug", console.log);
 */

for (const action of Object.keys(mathActions)) {
  Database.prototype[action] = function (...args) {
    const [key, ...rest] = args;
    return this.math(key, mathActions[action], ...rest);
  };
}

for (const action of Object.keys(aliasActions)) {
  Database.prototype[action] = function (...args) {
    return this[aliasActions[action]](...args);
  };
}

for (const action of Object.keys(pingMethods)) {
  Database.prototype[action] = function () {
    return Util.corePing.call(this, pingMethods[action]);
  };
}

/**
* Fetches the overall ping of quick.replit database in MS!
* @param {object} [ops={}] Ping options
* @example const ping = await db.ping();
* @return {Promise<Object>}
* console.log("Average: ", ping.average);
*/
Database.prototype.ping = async function () {
  this.emit('debug', 'ping', 'Getting the database ping...');
  const writeping = await this._write();
  const readping = await this._read();
  const deleteping = await this._delete();
  const average = (writeping + readping + deleteping) / 3;
  const ltc = {
    write: `${writeping}ms`,
    read: `${readping}ms`,
    delete: `${deleteping}ms`,
    average: `${Math.round(average)}ms`,
  };

  return ltc;
}

/**
* Returns database connection uptime!
* @return {Promise<Number>}
* @example console.log(`Database is up for ${db.uptime} ms.`);
*/
Database.prototype.uptime = function () {
  if (!this.readyAt) return 0;
  const timestamp = this.readyAt.getTime();
  return Date.now() - timestamp;
}

module.exports = Database;

const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { helpers } = require('../libs/quick.replit.mod/');
const debug = require('debug')('key-value-server:->manual->saveKey');
const moment = require('moment');

(async () => {

  try {
    let result = null;
    result = await helpers.saveKey('a1', { test: 444 });
    debug(result);

    result = await helpers.saveKey('b1', 9, moment().add(-1, 'minute').format());
    debug(result);

    result = await helpers.saveKey('c1', JSON.stringify({ test: 444 }));
    debug(result);

    result = await helpers.saveKey('d1', null, moment().add(1, 'day').toDate());
    debug(result);

  } catch (err) {
    debug('Error connect', err);
    process.exit();
  }

})();

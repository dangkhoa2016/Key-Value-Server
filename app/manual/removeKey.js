const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { helpers } = require('../libs/quick.replit.mod/');
const debug = require('debug')('key-value-server:->manual->removeKey');

(async () => {

  try {
    let result = null;
    result = await helpers.removeKey('a1');
    debug(result);

    result = await helpers.removeKey('b2');
    debug(result);

    result = await helpers.bulkRemoveKeys(['a1', 'c1', 'd1']);
    debug(result);

    result = await helpers.bulkRemoveKeys(['d1', null, 0]);
    debug(result);

  } catch (err) {
    debug('Error connect', err);
    process.exit();
  }

})();

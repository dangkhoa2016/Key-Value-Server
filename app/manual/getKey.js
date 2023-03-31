const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { helpers } = require('../libs/quick.replit.mod/');
const debug = require('debug')('key-value-server:->manual->getKey');

(async () => {

  try {
    let result = null;
    result = await helpers.getKey('a');
    debug(result);

    result = await helpers.getKey('b');
    debug(result);

    result = await helpers.getKey('c');
    debug(result);

    result = await helpers.getKey('d');
    debug(result);

  } catch (err) {
    debug('Error connect', err);
    process.exit();
  }

})();

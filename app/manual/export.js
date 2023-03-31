const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { helpers } = require('../libs/quick.replit.mod/');
const debug = require('debug')('key-value-server:->manual->export');

(async () => {

  try {
    let result = null;
    result = await helpers.export('a', 'csv');
    debug(result);

    result = await helpers.export('', 'json');
    debug(result);

  } catch (err) {
    debug('Error connect', err);
    process.exit();
  }

})();

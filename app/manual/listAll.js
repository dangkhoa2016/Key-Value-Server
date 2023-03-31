const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { helpers } = require('../libs/quick.replit.mod/');
const debug = require('debug')('key-value-server:->manual->listAll');

(async () => {

  try {
    let result = null;
    result = await helpers.listAll('a');
    debug(result);

    result = await helpers.listAll('b');
    debug(result);

    result = await helpers.listAll('c');
    debug(result);

    result = await helpers.listAll('d');
    debug(result);

    result = await helpers.listAll('');
    debug(result);

  } catch (err) {
    debug('Error connect', err);
    process.exit();
  }

})();

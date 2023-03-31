
const mustExcludes = ['/', 'favicon.ico', 'favicon.png', '404', '500'];
const enableStatuses = [true, 'e', 'enable'];
const sortDirectionAscending = ['a', 'asc', 'ascending', 'true', true];
const ISO8601format = ['YYYY-MM-DDTHH:mm:ss.SSSSZ', 'YYYY-MM-DDTHH:mm:ss.sssZ', 'YYYY-MM-DDTHH:mm:ssZ'];

const statusCodes = {
  INVALID_TOKEN: 400,
  MISSING_TOKEN: 425,
  INVALID_REQUEST_SO_MANY_TIMES: 428,
  ERROR_CONSUME_POINT: 501,
  NOT_FOUND: 404,
  DUPLICATED: 409,
  OK: 200,
  INTERNAL_SERVER_ERROR: 500,
  DATA_CREATED: 201,
  UNPROCESSABLE_ENTITY: 422,
  MUST_PROVIDE_USER_IP_ADDRESS: 421,
  INVALID_AUTH_TOKEN: 410,
  NO_CONTENT: 204,
  SESSION_HAS_BEEN_EXPIRED: 427,
  RECORD_ALREADY_EXISTS: 430,
  NOTHING_TO_IMPORT: 411,
  TOO_MANY_REQUESTS: 429,
}

const jwtConfig = {
  payload: {},
  options: {
    issuer: 'Key Value Server',
    audience: 'https://key-value-server.dangkhoa.dev',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    algorithm: 'RS256'
  }
}

module.exports = {
  mustExcludes, enableStatuses,
  sortDirectionAscending, ISO8601format,
  statusCodes, jwtConfig,
}

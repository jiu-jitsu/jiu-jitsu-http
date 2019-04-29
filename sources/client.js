
/**
 *
 */

const util = require('util')
const zlib = require('zlib')
const http2 = require('http2')

/**
 *
 */

const ___cry = require('./cry')
const ___zip = require('./zip')
const ___error = require('./error')

/**
 *
 */

const HTTP2_SESSION_OPTIONS = {}
const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_ACCEPT_ENCODING = http2.constants.HTTP2_HEADER_ACCEPT_ENCODING
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

/**
 *
 */

HTTP2_SESSION_OPTIONS.requestCert = true
HTTP2_SESSION_OPTIONS.rejectUnauthorized = false

/**
 *
 */

const noop = () => null

/**
 *
 */

const onSessionError = (message, options, session, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 *
 */

const onSessionTimeout = (message, options, session, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 *
 */

const onRequestError = (message, options, session, request, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 *
 */

const onRequestClose = (message, options, session, request, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 *
 */

const onRequestResponse = (message, options, session, request, headers, callback) => {

	/**
	 *
	 */

	const buffers = []

	/**
	 *
	 */

	const response = {}

	/**
	 *
	 */

	response.headers = headers

	/**
	 *
	 */

	response.headers[HTTP2_HEADER_CONTENT_TYPE] = response.headers[HTTP2_HEADER_CONTENT_TYPE] || ''
	response.headers[HTTP2_HEADER_CONTENT_ENCODING] = response.headers[HTTP2_HEADER_CONTENT_ENCODING] || ''

	/**
	 *
	 */

	if (response.headers[HTTP2_HEADER_STATUS] > 200) {

		/**
		 *
		 */

		request.end()
		session.close()

		/**
		 *
		 */

		return callback(___error('jiu-jitsu-http/FAILED_STATUS', response.headers[HTTP2_HEADER_STATUS]))

	}

	/**
	 *
	 */

	if (response.headers[HTTP2_HEADER_CONTENT_TYPE].indexOf('multipart/form-data') < 0) {

		/**
		 *
		 */

		request.end()
		session.close()

		/**
		 *
		 */

		return callback(___error('jiu-jitsu-http/FAILED_CONTENT'))

	}

	/**
	 *
	 */

	request.on('end', (error) => onRequestEnd(message, options, session, request, response, buffers, error, callback))
	request.on('data', (buffer) => onRequestData(message, options, session, request, response, buffers, buffer, callback))

}

/**
 *
 */

const onRequestData = (message, options, session, request, response, buffers, buffer, callback) => buffers.push(buffer)

/**
 *
 */

const onRequestEnd = (message, options, session, request, response, buffers, error, callback) => {

	/**
	 *
	 */

	request.end()
	session.close()

	/**
	 *
	 */

	response.message = Buffer.concat(buffers)

	/**
	 *
	 */

	try {

		/**
		 *
		 */

		if (response.headers[HTTP2_HEADER_CONTENT_ENCODING].indexOf('gzip') > -1) {

			/**
			 *
			 */

			response.message = zlib.unzipSync(response.message)

		}

		/**
		 *
		 */

		response.message = response.message.toString()
		response.message = options.key && ___cry.decrypt(response.message, options) || response.message
		response.message = options.key && ___zip.decrypt(response.message, options) || response.message
		response.message = JSON.parse(response.message)

		/**
		 *
		 */

	} catch (cause) {

		/**
		 *
		 */

		return callback(___error('jiu-jitsu-http/FAILED', cause))

	}

	/**
	 *
	 */

	return callback(null, response.message)

}

/**
 *
 */

const client = (options, message, callback) => {

	/**
	 *
	 */

	let session = null

	/**
	 *
	 */

	let request = null

	/**
	 *
	 */

	callback = callback || noop

	/**
	 *
	 */

	message = Object.assign({}, message)
	options = Object.assign({}, options)

	/**
	 *
	 */

	options.port = options.port || 80
	options.host = options.host || '127.0.0.1'

	/**
	 *
	 */

	options.headers = {}
	options.headers[HTTP2_HEADER_PATH] = '/'
	options.headers[HTTP2_HEADER_METHOD] = 'POST'
	options.headers[HTTP2_HEADER_ACCEPT_ENCODING] = 'gzip'
	options.headers[HTTP2_HEADER_CONTENT_ENCODING] = 'gzip'
	options.headers[HTTP2_HEADER_CONTENT_TYPE] = 'multipart/form-data'

	/**
	 *
	 */

	message.id = message.id || null
	message.api = message.api || null
	message.auth = message.auth || null
	message.data = message.data || null

	/**
	 *
	 */

	message = JSON.stringify(message)
	message = options.key && ___zip.encrypt(message, options) || message
	message = options.key && ___cry.encrypt(message, options) || message
	message = zlib.gzipSync(message)

	/**
	 *
	 */

	session = http2.connect(`https://${options.host}:${options.port}`, HTTP2_SESSION_OPTIONS)
	session.setTimeout(60 * 1000)

	/**
	 *
	 */

	request = session.request(options.headers)

	/**
	 *
	 */

	session.on('error', (error) => onSessionError(message, options, session, error, callback))
	session.on('timeout', (error) => onSessionTimeout(message, options, session, error, callback))
	request.on('error', (error) => onRequestError(message, options, session, request, error, callback))
	request.on('close', (error) => onRequestClose(message, options, session, request, error, callback))
	request.on('response', (headers) => onRequestResponse(message, options, session, request, headers, callback))

	/**
	 *
	 */

	request.write(message)
	request.end(null)

}

/**
 *
 */

module.exports = util.promisify(client)

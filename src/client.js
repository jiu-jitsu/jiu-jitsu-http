
/**
 * Native
 */

const util = require('util')
const zlib = require('zlib')
const http2 = require('http2')

/**
 * Jiu-Jitsu
 */

const ___zip = require('jiu-jitsu-zip')
const ___guid = require('jiu-jitsu-guid')
const ___error = require('jiu-jitsu-error')
const ___crypto = require('jiu-jitsu-crypto')

/**
 * Constants
 */

const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_ACCEPT_ENCODING = http2.constants.HTTP2_HEADER_ACCEPT_ENCODING
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

/**
 * Noop
 */

const noop = () => null

/**
 * onSessionError
 */

const onSessionError = (message, options, session, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 * onSessionTimeout
 */

const onSessionTimeout = (message, options, session, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 * onRequestError
 */

const onRequestError = (message, options, session, request, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 * onRequestClose
 */

const onRequestClose = (message, options, session, request, error, callback) => callback(___error('jiu-jitsu-http/FAILED', error))

/**
 * onRequestResponse
 */

const onRequestResponse = (message, options, session, request, headers, callback) => {

	/**
	 * Buffers
	 */

	const buffers = []

	/**
	 * Response
	 */

	const response = {}

	/**
	 * Set
	 */

	response.headers = headers

	/**
	 * Default
	 */

	response.headers[HTTP2_HEADER_CONTENT_TYPE] = response.headers[HTTP2_HEADER_CONTENT_TYPE] || ''
	response.headers[HTTP2_HEADER_CONTENT_ENCODING] = response.headers[HTTP2_HEADER_CONTENT_ENCODING] || ''

	/**
	 * Check
	 */

	if (response.headers[HTTP2_HEADER_STATUS] > 200) {

		/**
		 * End + Close
		 */

		request.end()
		session.close()

		/**
		 * Return
		 */

		return callback(___error('jiu-jitsu-http/FAILED_STATUS', response.headers[HTTP2_HEADER_STATUS]))

	}

	/**
	 * Check
	 */

	if (response.headers[HTTP2_HEADER_CONTENT_TYPE].indexOf('application/message') < 0) {

		/**
		 * End + Close
		 */

		request.end()
		session.close()

		/**
		 * Return
		 */

		return callback(___error('jiu-jitsu-http/FAILED_CONTENT'))

	}

	/**
	 * Listen
	 */

	request.on('end', (error) => onRequestEnd(message, options, session, request, response, buffers, error, callback))
	request.on('data', (buffer) => onRequestData(message, options, session, request, response, buffers, buffer, callback))

}

/**
 * onRequestData
 */

const onRequestData = (message, options, session, request, response, buffers, buffer, callback) => buffers.push(buffer)

/**
 * onRequestEnd
 */

const onRequestEnd = (message, options, session, request, response, buffers, error, callback) => {

	/**
	 * End + Close
	 */

	request.end()
	session.close()

	/**
	 * Concat
	 */

	response.message = Buffer.concat(buffers)

	/**
	 * Check
	 */

	if (options.key) {

		try {

			response.message = response.message.toString()
			response.message = ___crypto.decrypt(response.message, options)
			response.message = ___zip.decrypt(response.message, options)
			response.message = JSON.parse(response.message)

		} catch (cause) {

			return callback(___error('jiu-jitsu-http/FAILED', cause))

		}

	}

	/**
	 * Check
	 */

	if (!options.key) {

		try {

			response.message = zlib.unzipSync(response.message)
			response.message = JSON.parse(response.message)

		} catch (cause) {

			return callback(___error('jiu-jitsu-http/FAILED', cause))

		}

	}

	/**
	 * Return
	 */

	return callback(null, response.message)

}

/**
 * Client
 */

const client = (message, options, callback) => {

	/**
	 * Default
	 */

	message = Object.assign(message)
	options = Object.assign(options)

	/**
	 * Session
	 */

	let session = null

	/**
	 * Request
	 */

	let request = null

	/**
	 * Avoid undefined callback
	 */

	callback = callback || noop

	/**
	 * Default
	 */

	options.port = options.port || 80
	options.host = options.host || '127.0.0.1'
	options.protocol = options.ssl && 'https' || 'http'

	/**
	 * Headers
	 */

	options.headers = {}
	options.headers[HTTP2_HEADER_PATH] = '/'
	options.headers[HTTP2_HEADER_METHOD] = 'POST'
	options.headers[HTTP2_HEADER_ACCEPT_ENCODING] = 'gzip'
	options.headers[HTTP2_HEADER_CONTENT_TYPE] = 'application/message'

	/**
	 * Message
	 */

	message.id = message.id || null
	message.api = message.api || null
	message.auth = message.auth || null
	message.data = message.data || null

	/**
	 * Check
	 */

	if (options.key) {

		message = JSON.stringify(message)
		message = ___zip.encrypt(message, options)
		message = ___crypto.encrypt(message, options)

	}

	/**
	 * Check
	 */

	if (!options.key) {

		message = JSON.stringify(message)
		message = zlib.gzipSync(message)
		options.headers[HTTP2_HEADER_CONTENT_ENCODING] = 'gzip'

	}

	/**
	 * Session
	 */

	session = http2.connect(`${options.protocol}://${options.host}:${options.port}`)
	session.setTimeout(60 * 1000)

	/**
	 * Request
	 */

	request = session.request(options.headers)

	/**
	 * Listen
	 */

	session.on('error', (error) => onSessionError(message, options, session, error, callback))
	session.on('timeout', (error) => onSessionTimeout(message, options, session, error, callback))
	request.on('error', (error) => onRequestError(message, options, session, request, error, callback))
	request.on('close', (error) => onRequestClose(message, options, session, request, error, callback))
	request.on('response', (headers) => onRequestResponse(message, options, session, request, headers, callback))

	/**
	 * Write
	 */

	request.write(message)
	request.end(null)

}

/**
 * Export
 */

module.exports = util.promisify(client)



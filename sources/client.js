
/**
 *
 */

const util = require(`util`)
const zlib = require(`zlib`)
const http2 = require(`http2`)

/**
 *
 */

const ___aes = require(`jiu-jitsu-aes`)
const ___zip = require(`jiu-jitsu-zip`)
const ___error = require(`jiu-jitsu-error`)

/**
 *
 */

const NOOP = () => null

/**
 *
 */

const HTTP2_OPTIONS = {}
const HTTP2_SESSIONS = {}
const HTTP2_SESSION_TIMEOUT = 0x7FFFFFFF
const HTTP2_SESSION_MAX_REQUESTS = Math.pow(2, 8)
const HTTP2_SESSION_MAX_LISTENERS = Math.pow(2, 8)
const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_ACCEPT_ENCODING = http2.constants.HTTP2_HEADER_ACCEPT_ENCODING
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

/**
 *
 */

HTTP2_OPTIONS.requestCert = true
HTTP2_OPTIONS.rejectUnauthorized = false
HTTP2_OPTIONS.maxSessionMemory = Math.pow(2, 8)
HTTP2_OPTIONS.peerMaxConcurrentStreams = Math.pow(2, 16)

/**
 *
 */

const onSessionError = (message, options, session, error, callback) => {

	/**
	 *
	 */

	session.removeAllListeners(`error`)
	session.removeAllListeners(`timeout`)

	/**
	 *
	 */

	callback(___error(`jiu-jitsu-http/FAILED`, error))

}

/**
 *
 */

const onSessionTimeout = (message, options, session, error, callback) => {

	/**
	 *
	 */

	session.removeAllListeners(`error`)
	session.removeAllListeners(`timeout`)

	/**
	 *
	 */

	callback(___error(`jiu-jitsu-http/FAILED`, error))

}

/**
 *
 */

const onRequestError = (message, options, session, request, error, callback) => {

	/**
	 *
	 */

	if (session.count >= HTTP2_SESSION_MAX_REQUESTS) {
		setTimeout(() => session.close())
	}

	/**
	 *
	 */

	callback(___error(`jiu-jitsu-http/FAILED`, error))

}

/**
 *
 */

const onRequestClose = (message, options, session, request, error, callback) => {

	/**
	 *
	 */

	if (session.count >= HTTP2_SESSION_MAX_REQUESTS) {
		setTimeout(() => session.close())
	}

	/**
	 *
	 */

	callback(___error(`jiu-jitsu-http/FAILED`, error))

}

/**
 *
 */

const onRequestResponse = (message, options, session, request, headers, callback) => {

	/**
	 *
	 */

	const buffers = []
	const response = {}

	/**
	 *
	 */

	response.headers = headers
	response.headers[HTTP2_HEADER_CONTENT_TYPE] = response.headers[HTTP2_HEADER_CONTENT_TYPE] || ``
	response.headers[HTTP2_HEADER_CONTENT_ENCODING] = response.headers[HTTP2_HEADER_CONTENT_ENCODING] || ``

	/**
	 *
	 */

	if (response.headers[HTTP2_HEADER_STATUS] > 200) {
		request.end()
		return callback(___error(`jiu-jitsu-http/FAILED_STATUS`, response.headers[HTTP2_HEADER_STATUS]))
	}

	/**
	 *
	 */

	if (response.headers[HTTP2_HEADER_CONTENT_TYPE].indexOf(`multipart/form-data`) < 0) {
		request.end()
		return callback(___error(`jiu-jitsu-http/FAILED_CONTENT`))
	}

	/**
	 *
	 */

	request.on(`end`, (error) => onRequestEnd(message, options, session, request, response, buffers, error, callback))
	request.on(`data`, (buffer) => onRequestData(message, options, session, request, response, buffers, buffer, callback))

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
	request.removeAllListeners(`end`)
	request.removeAllListeners(`data`)
	request.removeAllListeners(`error`)
	request.removeAllListeners(`close`)
	request.removeAllListeners(`response`)

	/**
	 *
	 */

	if (session.count >= HTTP2_SESSION_MAX_REQUESTS) {
		setTimeout(() => session.close())
	}

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

		if (response.headers[HTTP2_HEADER_CONTENT_ENCODING].indexOf(`gzip`) > -1) {
			response.message = zlib.unzipSync(response.message)
		}

		/**
		 *
		 */

		response.message = response.message.toString()
		response.message = options.key && ___aes.decrypt(response.message, options) || response.message
		response.message = options.key && ___zip.decrypt(response.message, options) || response.message
		response.message = JSON.parse(response.message)

		/**
		 *
		 */

	} catch (cause) {

		/**
		 *
		 */

		return callback(___error(`jiu-jitsu-http/FAILED`, cause))

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

	callback = callback || NOOP

	/**
	 *
	 */

	message = Object.assign({}, message)
	options = Object.assign({}, options)

	/**
	 *
	 */

	options.port = options.port || 80
	options.host = options.host || `127.0.0.1`

	/**
	 *
	 */

	options.headers = {}
	options.headers[HTTP2_HEADER_PATH] = `/`
	options.headers[HTTP2_HEADER_METHOD] = `POST`
	options.headers[HTTP2_HEADER_ACCEPT_ENCODING] = `gzip`
	options.headers[HTTP2_HEADER_CONTENT_ENCODING] = `gzip`
	options.headers[HTTP2_HEADER_CONTENT_TYPE] = `multipart/form-data`

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
	message = options.key && ___aes.encrypt(message, options) || message
	message = zlib.gzipSync(message)

	/**
	 *
	 */

	const authority = `https://${options.host}:${options.port}`

	/**
	 *
	 */

	const existing = HTTP2_SESSIONS[authority]

	/**
	 *
	 */

	if (existing && (existing.closed || existing.destroyed)) {
		HTTP2_SESSIONS[authority] = undefined
	}

	/**
	 *
	 */

	const session = HTTP2_SESSIONS[authority] || http2.connect(authority, HTTP2_OPTIONS)

	/**
	 *
	 */

	if (!HTTP2_SESSIONS[authority]) {
		session.count = 0
		session.setTimeout(HTTP2_SESSION_TIMEOUT)
		session.setMaxListeners(HTTP2_SESSION_MAX_LISTENERS)
		session.once(`error`, (error) => onSessionError(message, options, session, error, callback))
		session.once(`timeout`, (error) => onSessionTimeout(message, options, session, error, callback))
	}

	/**
	 *
	 */

	if (!HTTP2_SESSIONS[authority]) {
		HTTP2_SESSIONS[authority] = session
	}

	/**
	 *
	 */

	if (++session.count >= HTTP2_SESSION_MAX_REQUESTS) {
		HTTP2_SESSIONS[authority] = undefined
	}

	/**
	 *
	 */

	const request = session.request(options.headers)

	/**
	 *
	 */

	request.once(`error`, (error) => onRequestError(message, options, session, request, error, callback))
	request.once(`close`, (error) => onRequestClose(message, options, session, request, error, callback))
	request.once(`response`, (headers) => onRequestResponse(message, options, session, request, headers, callback))

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

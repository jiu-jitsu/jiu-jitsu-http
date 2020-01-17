
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

const middlePost = require(`./middle/client/post`)

/**
 *
 */

const NOOP = () => null

/**
 *
 */

const HTTP2_SESSION_TIMEOUT = 0x7FFFFFFF
const HTTP2_SESSION_MAX_REQUESTS = 64
const HTTP2_SESSION_MAX_LISTENERS = 1024
const HTTP2_METHOD_GET = http2.constants.HTTP2_METHOD_GET
const HTTP2_METHOD_PUT = http2.constants.HTTP2_METHOD_PUT
const HTTP2_METHOD_POST = http2.constants.HTTP2_METHOD_POST
const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_ACCEPT_ENCODING = http2.constants.HTTP2_HEADER_ACCEPT_ENCODING
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

/**
 *
 */

const HTTP2_OPTIONS = {}
const HTTP2_SESSIONS = {}
const HTTP2_METHOD_GET_HEADERS = {}
const HTTP2_METHOD_PUT_HEADERS = {}
const HTTP2_METHOD_POST_HEADERS = {}

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

HTTP2_METHOD_POST_HEADERS[HTTP2_HEADER_PATH] = `/`
HTTP2_METHOD_POST_HEADERS[HTTP2_HEADER_METHOD] = `POST`
HTTP2_METHOD_POST_HEADERS[HTTP2_HEADER_ACCEPT_ENCODING] = `gzip`
HTTP2_METHOD_POST_HEADERS[HTTP2_HEADER_CONTENT_ENCODING] = `gzip`
HTTP2_METHOD_POST_HEADERS[HTTP2_HEADER_CONTENT_TYPE] = `application/json`

/**
 *
 */

class Client {

	/**
	 *
	 */

	constructor (options) {

		/**
		 *
		 */

		this.get = util.promisify(this.get)
		this.file = util.promisify(this.file)
		this.message = util.promisify(this.message)

		/**
		 *
		 */

		this.options = options
		this.authority = `https://${options.host}:${options.port}`

	}

	/**
	 *
	 */

	get (url, callback = NOOP) {
		callback(null)
	}

	/**
	 *
	 */

	file (file, callback = NOOP) {
		callback(null)
	}

	/**
	 *
	 */

	message (message, callback = NOOP) {

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
		message = this.options.key && ___zip.encrypt(message, this.options) || message
		message = this.options.key && ___aes.encrypt(message, this.options) || message
		message = zlib.gzipSync(message)

		/**
		 *
		 */

		this.___send(HTTP2_METHOD_POST, HTTP2_METHOD_POST_HEADERS, message, callback)

	}

	/**
	 *
	 */

	___send (method, headers, body, callback) {

		/**
		 *
		 */

		if (HTTP2_SESSIONS[this.authority] && HTTP2_SESSIONS[this.authority].closed) {
			HTTP2_SESSIONS[this.authority] = undefined
		}

		/**
		 *
		 */

		if (HTTP2_SESSIONS[this.authority] && HTTP2_SESSIONS[this.authority].destroyed) {
			HTTP2_SESSIONS[this.authority] = undefined
		}

		/**
		 *
		 */

		const session = HTTP2_SESSIONS[this.authority] || http2.connect(this.authority, HTTP2_OPTIONS)

		/**
		 *
		 */

		if (!HTTP2_SESSIONS[this.authority]) {
			session.count = 0
			session.setTimeout(HTTP2_SESSION_TIMEOUT)
			session.setMaxListeners(HTTP2_SESSION_MAX_LISTENERS)
			session.once(`error`, (error) => this.___onSessionError(session, error, callback))
			session.once(`timeout`, (error) => this.___onSessionTimeout(session, error, callback))
		}

		/**
		 *
		 */

		if (!HTTP2_SESSIONS[this.authority]) {
			HTTP2_SESSIONS[this.authority] = session
		}

		/**
		 *
		 */

		if (++session.count >= HTTP2_SESSION_MAX_REQUESTS) {
			HTTP2_SESSIONS[this.authority] = undefined
		}

		/**
		 *
		 */

		const request = session.request(headers)

		/**
		 *
		 */

		request.method = method
		request.headers = headers

		/**
		 *
		 */

		request.once(`error`, (error) => this.___onRequestError(session, request, error, callback))
		request.once(`close`, (error) => this.___onRequestClose(session, request, error, callback))
		request.once(`response`, (headers) => this.onRequestResponse(session, request, headers, callback))

		/**
		 *
		 */

		if (method === HTTP2_METHOD_POST) {
			request.write(body)
			request.end(null)
			return
		}

		/**
		 *
		 */

		callback(null)

	}

	/**
	 *
	 */

	___onSessionError (session, error, callback) {

		/**
		 *
		 */

		session.removeAllListeners(`error`)
		session.removeAllListeners(`timeout`)

		/**
		 *
		 */

		error = ___error(null, `jiu-jitsu-http`, `FAIL`, `HTTP_SESSION_ERROR`, error)

		/**
		 *
		 */

		callback(error)

	}

	/**
	 *
	 */

	___onSessionTimeout (session, error, callback) {

		/**
		 *
		 */

		session.removeAllListeners(`error`)
		session.removeAllListeners(`timeout`)

		/**
		 *
		 */

		error = ___error(null, `jiu-jitsu-http`, `FAIL`, `HTTP_SESSION_TIMEOUT`, error)

		/**
		 *
		 */

		callback(error)

	}

	/**
	 *
	 */

	___onRequestError (session, request, error, callback) {

		/**
		 *
		 */

		if (session.count >= HTTP2_SESSION_MAX_REQUESTS) {
			setTimeout(() => session.close())
		}

		/**
		 *
		 */

		error = ___error(null, `jiu-jitsu-http`, `FAIL`, `HTTP_REQUEST_ERROR`, error)

		/**
		 *
		 */

		callback(error)

	}

	/**
	 *
	 */

	___onRequestClose (session, request, error, callback) {

		/**
		 *
		 */

		if (session.count >= HTTP2_SESSION_MAX_REQUESTS) {
			setTimeout(() => session.close())
		}

		/**
		 *
		 */

		error = ___error(null, `jiu-jitsu-http`, `FAIL`, `HTTP_REQUEST_CLOSE`, error)

		/**
		 *
		 */

		callback(error)

	}

	/**
	 *
	 */

	onRequestResponse (session, request, headers, callback) {

		/**
		 *
		 */

		const response = {}

		/**
		 *
		 */

		response.buffers = []
		response.headers = headers
		response.headers[HTTP2_HEADER_CONTENT_TYPE] = response.headers[HTTP2_HEADER_CONTENT_TYPE] || ``
		response.headers[HTTP2_HEADER_CONTENT_ENCODING] = response.headers[HTTP2_HEADER_CONTENT_ENCODING] || ``

		/**
		 *
		 */

		const responseHeaderStatus = response.headers[HTTP2_HEADER_STATUS]

		/**
		 *
		 */

		if (responseHeaderStatus > 200) {
			request.end()
			const error = ___error(null, `jiu-jitsu-http`, `FAIL`, `HTTP_RESPONSE_HEADER_STATUS`, responseHeaderStatus)
			return callback(error)
		}

		/**
		 *
		 */

		if (request.method === HTTP2_METHOD_POST) {
			return middlePost(this, session, request, response, callback)
		}

	}

}

/**
 *
 */

module.exports = Client

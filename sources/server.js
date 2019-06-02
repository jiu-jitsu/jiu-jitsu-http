
/**
 *
 */

const fs = require(`fs`)
const url = require(`url`)
const zlib = require(`zlib`)
const http2 = require(`http2`)
const events = require(`events`)
const querystring = require(`querystring`)

/**
 *
 */

const ___aes = require(`jiu-jitsu-aes`)
const ___zip = require(`jiu-jitsu-zip`)
const ___uuid = require(`jiu-jitsu-uuid`)

/**
 *
 */

const middleMessage = require(`./middle/message`)

/**
 *
 */

const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_METHOD_POST = http2.constants.HTTP2_METHOD_POST
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_SCHEME = http2.constants.HTTP2_HEADER_SCHEME
const HTTP2_HEADER_AUTHORITY = http2.constants.HTTP2_HEADER_AUTHORITY
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING
const HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN = http2.constants.HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN
const HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS = http2.constants.HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS

/**
 *
 */

const HTTP2_SESSION_TIMEOUT = 0x7FFFFFFF
const HTTP2_PADDING_STRATEGY_MAX = http2.constants.PADDING_STRATEGY_MAX
const HTTP2_PEER_MAX_CONCURRENT_STREAMS = Math.pow(2, 16)

/**
 *
 */

class Server extends events {

	/**
	 *
	 */

	constructor (options) {

		/**
		 *
		 */

		super()

		/**
		 *
		 */

		this.___apis = {}
		this.___options = options
		this.___default = {}
		this.___default.key = fs.readFileSync(`${options.certificates}/server.key`).toString()
		this.___default.cert = fs.readFileSync(`${options.certificates}/server.cert`).toString()
		this.___default.paddingStrategy = HTTP2_PADDING_STRATEGY_MAX
		this.___default.peerMaxConcurrentStreams = HTTP2_PEER_MAX_CONCURRENT_STREAMS
		this.___listen()

	}

	/**
	 *
	 */

	message (api, next) {

		/**
		 *
		 */

		this.___apis[api] = next

		/**
		 *
		 */

		return this

	}

	/**
	 *
	 */

	___listen () {

		/**
		 *
		 */

		this.server = http2.createSecureServer(this.___default)
		this.server.on(`close`, (error) => this.___onClose(error))
		this.server.on(`error`, (error) => this.___onError(error))
		this.server.on(`session`, (error) => this.___onSession(error))
		this.server.on(`listening`, (error) => this.___onListening(error))

		/**
		 *
		 */

		this.server.listen(this.___options.port, this.___options.host)

		/**
		 *
		 */

		this.server.on(`request`, (request, response) => this.___onRequest(request, response))

	}

	/**
	 *
	 */

	___onClose (error) {

		/**
		 *
		 */

		process.nextTick(() => this.emit(`close`, error))

	}

	/**
	 *
	 */

	___onError (error) {

		/**
		 *
		 */

		process.nextTick(() => this.emit(`error`, error))

	}

	/**
	 *
	 */

	___onSession (session) {

		/**
		 *
		 */

		session.setTimeout(HTTP2_SESSION_TIMEOUT)

		/**
		 *
		 */

		process.nextTick(() => this.emit(`session`, session))

	}

	/**
	 *
	 */

	___onListening (error) {

		/**
		 *
		 */

		process.nextTick(() => this.emit(`ready`, error))

	}

	/**
	 *
	 */

	___onRequest (request, response) {

		/**
		 *
		 */

		this.___extend(request, response)
		this.___handler(request, response)

	}

	/**
	 *
	 */

	___ip (request, response) {

		/**
		 *
		 */

		request.ip =
			request.headers[`x-ip`] ||
			request.headers[`x-real-ip`] ||
			request.headers[`x-forwarded-for`] &&
			request.headers[`x-forwarded-for`].split(`,`).pop() ||
			request.socket.remoteAddress ||
			request.connection.remoteAddress

	}

	/**
	 *
	 */

	___url (request, response) {

		/**
		 *
		 */

		request.url = url.parse(`${request.headers[HTTP2_HEADER_SCHEME]}://${request.headers[HTTP2_HEADER_AUTHORITY]}${request.headers[HTTP2_HEADER_PATH]}`)
		request.url.query = querystring.parse(request.url.query)
		request.url.protocol = request.url.protocol.split(`:`)[0]

	}

	/**
	 *
	 */

	___extend (request, response) {

		/**
		 *
		 */

		this.___ip(request, response)
		this.___url(request, response)

		/**
		 *
		 */

		request.headers[HTTP2_HEADER_CONTENT_TYPE] = request.headers[HTTP2_HEADER_CONTENT_TYPE] || ``
		request.headers[HTTP2_HEADER_CONTENT_ENCODING] = request.headers[HTTP2_HEADER_CONTENT_ENCODING] || ``

	}

	/**
	 *
	 */

	___socketSend (socket, request, response, message) {

		/**
		 *
		 */

		if (response.finished) {
			return
		}

		/**
		 *
		 */

		message = JSON.stringify(message)
		message = this.___options.key && ___zip.encrypt(message, this.___options) || message
		message = this.___options.key && ___aes.encrypt(message, this.___options) || message
		message = zlib.gzipSync(message)

		/**
		 *
		 */

		response.setHeader(HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN, `*`)
		response.setHeader(HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS, `Content-Type, Content-Encoding`)
		response.setHeader(HTTP2_HEADER_CONTENT_TYPE, `multipart/form-data`)
		response.setHeader(HTTP2_HEADER_CONTENT_ENCODING, `gzip`)
		response.writeHead(200)
		response.write(message)
		response.end(null)

	}

	/**
	 *
	 */

	___socketDestroy (socket, request, response, message) {

		/**
		 *
		 */

		request.destroy()
		response.destroy()

	}

	/**
	 *
	 */

	___handler (request, response) {

		/**
		 *
		 */

		const socket = {}

		/**
		 *
		 */

		socket.id = ___uuid()
		socket.ip = request.ip
		socket.message = null
		socket.send = (message) => this.___socketSend(socket, request, response, message)
		socket.destroy = (message) => this.___socketDestroy(socket, request, response, message)

		/**
		 *
		 */

		if (request.headers[HTTP2_HEADER_METHOD] === HTTP2_METHOD_POST && request.headers[HTTP2_HEADER_CONTENT_TYPE] === `multipart/form-data`) {
			return middleMessage(socket, request, response, this.___options, this.___apis)
		}

		/**
		 *
		 */

		return socket.destroy()

	}

}

/**
 *
 */

module.exports = Server

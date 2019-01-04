
/**
 * Native
 */

const fs = require('fs')
const url = require('url')
const zlib = require('zlib')
const http2 = require('http2')
const events = require('events')
const querystring = require('querystring')

/**
 * Jiu-Jitsu
 */

const ___zip = require('jiu-jitsu-zip')
const ___guid = require('jiu-jitsu-guid')
const ___crypto = require('jiu-jitsu-crypto')

/**
 * Middlewares
 */

const middlewares = require('./middlewares')

/**
 * Constants
 */

const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_SCHEME = http2.constants.HTTP2_HEADER_SCHEME
const HTTP2_HEADER_AUTHORITY = http2.constants.HTTP2_HEADER_AUTHORITY
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING
const PADDING_STRATEGY_MAX = http2.constants.PADDING_STRATEGY_MAX

/**
 * Server
 */

class Server extends events {

	constructor (options) {

		super()

		this.___apis = {}
		this.___options = options
		this.___default = {}
		this.___default.key = fs.readFileSync(`${options.ssl}/server.key`)
		this.___default.cert = fs.readFileSync(`${options.ssl}/server.cert`)
		this.___default.paddingStrategy = PADDING_STRATEGY_MAX
		this.___default.peerMaxConcurrentStreams = Math.pow(2, 16)
		this.___listen()

	}

	message (api, next) {

		this.___apis[api] = next

		return this

	}

	___listen () {

		this.server = http2.createSecureServer(this.___default)
		this.server.on('close', (error) => this.___onClose(error))
		this.server.on('error', (error) => this.___onError(error))
		this.server.on('listening', (error) => this.___onListening(error))
		this.server.on('request', (request, response) => this.___onRequest(request, response))
		this.server.listen(this.___options.port, this.___options.host)

	}

	___onClose (error) {

		process.nextTick(() => this.emit('close', error))

	}

	___onError (error) {

		process.nextTick(() => this.emit('error', error))

	}

	___onListening (error) {

		process.nextTick(() => this.emit('ready', error))

	}

	___onRequest (request, response) {

		this.___extend(request, response)
		this.___handler(request, response)

	}

	___ip (request, response) {

		request.ip =
			request.headers['x-real-ip'] ||
			request.headers['x-forwarded-for'] &&
			request.headers['x-forwarded-for'].split(',').pop() ||
			request.socket.remoteAddress ||
			request.connection.remoteAddress

	}

	___url (request, response) {

		request.url = url.parse(`${request.headers[HTTP2_HEADER_SCHEME]}://${request.headers[HTTP2_HEADER_AUTHORITY]}${request.headers[HTTP2_HEADER_PATH]}`)
		request.url.query = querystring.parse(request.url.query)
		request.url.protocol = request.url.protocol.split(':')[0]

	}

	___extend (request, response) {

		this.___ip(request, response)
		this.___url(request, response)

		/**
		 * Default
		 */

		request.headers[HTTP2_HEADER_CONTENT_TYPE] = request.headers[HTTP2_HEADER_CONTENT_TYPE] || ''
		request.headers[HTTP2_HEADER_CONTENT_ENCODING] = request.headers[HTTP2_HEADER_CONTENT_ENCODING] || ''

	}

	___socketReturn (socket, request, response, message) {

		/**
		 * Check
		 */

		if (response.finished) {

			return

		}

		/**
		 * Check
		 */

		if (this.___options.key) {

			message = JSON.stringify(message)
			message = ___zip.encrypt(message, this.___options)
			message = ___crypto.encrypt(message, this.___options)

		}

		/**
		 * Check
		 */

		if (!this.___options.key) {

			message = JSON.stringify(message)
			message = zlib.gzipSync(message)
			response.setHeader(HTTP2_HEADER_CONTENT_ENCODING, 'gzip')

		}

		response.setHeader(HTTP2_HEADER_CONTENT_TYPE, 'application/message')
		response.writeHead(200)
		response.write(message)
		response.end(null)

	}

	___socketDestroy (socket, request, response, message) {

		request.destroy()
		response.destroy()

	}

	___handler (request, response) {

		/**
		 * Socket
		 */

		const socket = {}

		/**
		 * Extend
		 */

		socket.id = ___guid(32)
		socket.ip = request.ip
		socket.message = null
		socket.return = (message) => this.___socketReturn(socket, request, response, message)
		socket.destroy = (message) => this.___socketDestroy(socket, request, response, message)

		/**
		 * Post + Message
		 */

		if (request.headers[HTTP2_HEADER_METHOD] === 'POST' && request.headers[HTTP2_HEADER_CONTENT_TYPE].indexOf('application/message') > -1) {

			return middlewares.message(socket, request, response, this.___options, this.___apis)

		}

		/**
		 * Destroy in any other case
		 */

		return socket.destroy()

	}

}

/**
 * Export
 */

module.exports = Server



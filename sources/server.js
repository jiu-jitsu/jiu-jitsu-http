
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

const middleGet = require(`./middle/server/get`)
const middlePut = require(`./middle/server/put`)
const middlePost = require(`./middle/server/post`)
const middleOptions = require(`./middle/server/options`)

/**
 *
 */

const HTTP2_METHOD_GET = http2.constants.HTTP2_METHOD_GET
const HTTP2_METHOD_PUT = http2.constants.HTTP2_METHOD_PUT
const HTTP2_METHOD_POST = http2.constants.HTTP2_METHOD_POST
const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_SCHEME = http2.constants.HTTP2_HEADER_SCHEME
const HTTPS_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_METHOD_OPTIONS = http2.constants.HTTP2_METHOD_OPTIONS
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

		this.___get = {}
		this.___put = {}
		this.___post = {}
		this.___default = {}

		/**
		 *
		 */

		this.___options = options
		this.___default.key = fs.readFileSync(`${options.dir}/${options.ssl}.key`).toString()
		this.___default.cert = fs.readFileSync(`${options.dir}/${options.ssl}.cert`).toString()
		this.___default.paddingStrategy = HTTP2_PADDING_STRATEGY_MAX
		this.___default.peerMaxConcurrentStreams = HTTP2_PEER_MAX_CONCURRENT_STREAMS
		this.___listen()

	}

	/**
	 *
	 */

	get (key, next) {
		this.___get[key] = next
	}

	/**
	 *
	 */

	file (key, next) {
		this.___put[key] = next
	}

	/**
	 *
	 */

	message (key, next) {
		this.___post[key] = next
	}

	/**
	 *
	 */

	___listen () {
		this.server = http2.createSecureServer(this.___default)
		this.server.on(`close`, (error) => this.___onClose(error))
		this.server.on(`error`, (error) => this.___onError(error))
		this.server.on(`session`, (error) => this.___onSession(error))
		this.server.on(`listening`, (error) => this.___onListening(error))
		this.server.on(`request`, (request, response) => this.___onRequest(request, response))
		this.server.listen(this.___options.port, this.___options.host)
	}

	/**
	 *
	 */

	___onClose (error) {
		process.nextTick(() => this.emit(`close`, error))
	}

	/**
	 *
	 */

	___onError (error) {
		process.nextTick(() => this.emit(`error`, error))
	}

	/**
	 *
	 */

	___onListening (error) {
		process.nextTick(() => this.emit(`ready`, error))
	}

	/**
	 *
	 */

	___onSession (session) {
		session.setTimeout(HTTP2_SESSION_TIMEOUT)
		process.nextTick(() => this.emit(`session`, session))
	}

	/**
	 *
	 */

	___onRequest (request, response) {
		this.___extend(request, response)
		this.___handler(request, response)
	}

	/**
	 *
	 */

	___ip (request) {
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

	___url (request) {
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

	___socketSend (socket, request, response, body) {

		/**
		 *
		 */

		const method = request.headers[HTTP2_HEADER_METHOD]

		/**
		 *
		 */

		if (response.finished) {
			return
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_GET) {
			return this.___socketSendFiles(socket, request, response, body)
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_PUT) {
			return
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_POST) {
			return this.___socketSendMessage(socket, request, response, body)
		}

	}

	/**
	 *
	 */

	___socketSendFile (socket, request, response, stream, file) {

		/**
		 *
		 */

		const headers = {}

		/**
		 *
		 */

		headers[HTTPS_HEADER_STATUS] = 200
		headers[HTTP2_HEADER_CONTENT_TYPE] = file.type

		/**
		 *
		 */

		if (file.zip) {
			headers[HTTP2_HEADER_CONTENT_ENCODING] = `gzip`
		}

		/**
		 *
		 */

		stream.on(`error`, () =>
			fileGzipStream.destroy() |
			fileReadStream.destroy())

		/**
		 *
		 */

		stream.respond(headers)

		/**
		 *
		 */

		const fileGzipStream = zlib.createGzip()
		const fileReadStream = fs.createReadStream(file.path)

		/**
		 *
		 */

		file.zip
			? fileReadStream.pipe(fileGzipStream).pipe(stream)
			: fileReadStream.pipe(stream)

	}

	/**
	 *
	 */

	___socketSendFiles (socket, request, response, files) {

		/**
		 * file: {
		 *  source: String,
		 *  type: String,
		 *  path: String,
		 *  push: Boolean,
		 *  zip: Boolean
		 * }
		 */

		files.forEach((file) => {
			if (file.push) {
				const headers = {}
				headers[HTTP2_HEADER_PATH] = file.source
				response.stream.pushStream(headers, (error, pushStream) => !error && this.___socketSendFile(socket, request, response, pushStream, file))
			} else {
				const responseStream = response.stream
				this.___socketSendFile(socket, request, response, responseStream, file)
			}
		})

	}

	/**
	 *
	 */

	___socketSendMessage (socket, request, response, message) {

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

		response.setHeader(HTTP2_HEADER_CONTENT_TYPE, `application/json`)
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
		const method = request.headers[HTTP2_HEADER_METHOD]

		/**
		 *
		 */

		socket.id = ___uuid()
		socket.ip = request.ip
		socket.url = request.url
		socket.headers = request.headers

		/**
		 *
		 */

		socket.file = null
		socket.message = null
		socket.request = null
		socket.response = null

		/**
		 *
		 */

		socket.send = (message) => this.___socketSend(socket, request, response, message)
		socket.destroy = (message) => this.___socketDestroy(socket, request, response, message)

		/**
		 *
		 */

		response.setHeader(HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN, `*`)
		response.setHeader(HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS, `*`)

		/**
		 *
		 */

		if (method === HTTP2_METHOD_GET) {
			return middleGet(this, socket, request, response)
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_PUT) {
			return middlePut(this, socket, request, response)
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_POST) {
			return middlePost(this, socket, request, response)
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_OPTIONS) {
			return middleOptions(this, socket, request, response)
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

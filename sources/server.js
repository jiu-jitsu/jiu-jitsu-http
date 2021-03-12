
/**
 *
 */

const fs = require("fs")
const url = require("url")
const http2 = require("http2")
const querystring = require("querystring")

/**
 *
 */

const LOG = require("jiu-jitsu-log")
const UUID = require("jiu-jitsu-uuid")

/**
 *
 */

const middleGet = require("./middle/server/get")
const middlePut = require("./middle/server/put")
const middlePost = require("./middle/server/post")
const middleOptions = require("./middle/server/options")

/**
 *
 */

const HTTP2_METHOD_GET = http2.constants.HTTP2_METHOD_GET
const HTTP2_METHOD_PUT = http2.constants.HTTP2_METHOD_PUT
const HTTP2_METHOD_POST = http2.constants.HTTP2_METHOD_POST
const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_SCHEME = http2.constants.HTTP2_HEADER_SCHEME
const HTTP2_METHOD_OPTIONS = http2.constants.HTTP2_METHOD_OPTIONS
const HTTP2_HEADER_AUTHORITY = http2.constants.HTTP2_HEADER_AUTHORITY

/**
 *
 */

const HTTP2_SESSION_TIMEOUT = 86400000
const HTTP2_PEER_MAX_CONCURRENT_STREAMS = 16000
const HTTP2_PADDING_STRATEGY_MAX = http2.constants.PADDING_STRATEGY_MAX

/**
 *
 */

const CWD = process.cwd()

/**
 *
 */

class Server {

	/**
	 *
	 */

	constructor (options) {
		this.___get = {}
		this.___put = {}
		this.___post = {}
		this.___options = options
		this.___settings = {}
		this.___settings.key = fs.readFileSync(`${CWD}/${options["ssl"]}/ssl.key`).toString()
		this.___settings.cert = fs.readFileSync(`${CWD}/${options["ssl"]}/ssl.cert`).toString()
		this.___settings.paddingStrategy = HTTP2_PADDING_STRATEGY_MAX
		this.___settings.peerMaxConcurrentStreams = HTTP2_PEER_MAX_CONCURRENT_STREAMS
	}

	/**
	 *
	 */

	async get (key, next) {
		this.___get[key] = next
	}

	/**
	 *
	 */

	async file (key, next) {
		this.___put[key] = next
	}

	/**
	 *
	 */

	async message (key, next) {
		this.___post[key] = next
	}

	/**
	 *
	 */

	async connect () {
		await new Promise(async (resolve) => await this.___connect(resolve))
	}

	/**
	 *
	 */

	async ___connect (resolve) {
		const options = this.___options
		const settings = this.___settings
		this.server = http2.createSecureServer(settings)
		this.server.on("error", async (error) => await this.___onError(error))
		this.server.on("listening", async (error) => await this.___onListening(error, resolve))
		this.server.on("session", async (session) => await this.___onSession(session))
		this.server.on("stream", async (stream, headers) => await this.___onStream(stream, headers))
		this.server.listen(options.port, options.host)
	}

	/**
	 *
	 */

	async ___onError (error) {
		new LOG("jiu-jitsu-http|SERVER", "ERROR", ["!", error], true)
		process.exit(1)
	}

	/**
	 *
	 */

	async ___onListening (error, resolve) {
		new LOG("jiu-jitsu-http|SERVER", "OK", ["✔"], true)
		resolve(error)
	}

	/**
	 *
	 */

	async ___onSession (session) {
		session.setTimeout(HTTP2_SESSION_TIMEOUT)
		session.on("once", async (error) => await this.___onSessionError(session, error))
		session.on("once", async (error) => await this.___onSessionTimeout(session, error))
	}

	/**
	 *
	 */

	async ___onSessionError (session, error) {
		new LOG("jiu-jitsu-http|HTTP_SESSION_ERROR", "ERROR", ["!", error] , true)
		session.close()
		session.destroy()
	}

	/**
	 *
	 */

	async ___onSessionTimeout (session, error) {
		new LOG("jiu-jitsu-http|HTTP_SESSION_TIMEOUT", "ERROR", ["!", error] , true)
		session.close()
		session.destroy()
	}

	/**
	 *
	 */

	async ___onStream (stream, headers) {

		/**
		 *
		 */

		const socket = {}

		/**
		 *
		 */

		socket.id = UUID()
		socket.ip = this.___ip(stream, headers)
		socket.url = this.___url(stream, headers)
		socket.request = null
		socket.response = null

		/**
		 *
		 */

		const method = headers[HTTP2_HEADER_METHOD]

		/**
		 *
		 */

		if (method === HTTP2_METHOD_GET) {
			return middleGet(this, socket, stream, headers)
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_PUT) {
			return middlePut(this, socket, stream, headers)
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_POST) {
			return middlePost(this, socket, stream, headers)
		}

		/**
		 *
		 */

		if (method === HTTP2_METHOD_OPTIONS) {
			return middleOptions(this, socket, stream, headers)
		}

		/**
		 *
		 */

		return stream.destroy()

	}

	/**
	 *
	 */

	___ip (stream) {
		stream.ip = stream.session.socket.remoteAddress
	}

	/**
	 *
	 */

	___url (stream, headers) {
		const schema = headers[HTTP2_HEADER_SCHEME]
		const authority = headers[HTTP2_HEADER_AUTHORITY]
		const path = headers[HTTP2_HEADER_PATH]
		const options = url.parse(`${schema}://${authority}${path}`)
		options.query = querystring.parse(options.query)
		options.protocol = options.protocol.split(":")[0]
		return options
	}

}

/**
 *
 */

module.exports = Server

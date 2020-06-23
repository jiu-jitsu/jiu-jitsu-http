
/**
 *
 */

const fs = require(`fs`)
const url = require(`url`)
const http2 = require(`http2`)
const events = require(`events`)
const querystring = require(`querystring`)

/**
 *
 */

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
		this.___settings = {}

		/**
		 *
		 */

		this.___options = options
		this.___settings.key = fs.readFileSync(`${options.dir}/${options.ssl}.key`).toString()
		this.___settings.cert = fs.readFileSync(`${options.dir}/${options.ssl}.cert`).toString()
		this.___settings.paddingStrategy = HTTP2_PADDING_STRATEGY_MAX
		this.___settings.peerMaxConcurrentStreams = HTTP2_PEER_MAX_CONCURRENT_STREAMS
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
		const options = this.___options
		const settings = this.___settings
		this.server = http2.createSecureServer(settings)
		this.server.on(`close`, (error) => this.___onClose(error))
		this.server.on(`error`, (error) => this.___onError(error))
		this.server.on(`listening`, (error) => this.___onListening(error))
		this.server.on(`session`, (error) => this.___onSession(error))
		this.server.on(`stream`, (stream, headers) => this.___onStream(stream, headers))
		this.server.listen(options.port, options.host)
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
		session.on(`once`, (error) => this.___onSessionError(session, error))
		session.on(`once`, (error) => this.___onSessionTimeout(session, error))
	}

	/**
	 *
	 */

	___onSessionError (session, error) {
		session.close()
		session.destroy()
	}

	/**
	 *
	 */

	___onSessionTimeout (session, error) {
		session.close()
		session.destroy()
	}

	/**
	 *
	 */

	___onStream (stream, headers) {

		/**
		 *
		 */

		const socket = {}

		/**
		 *
		 */

		socket.id = ___uuid()
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
		options.protocol = options.protocol.split(`:`)[0]
		return options
	}

}

/**
 *
 */

module.exports = Server

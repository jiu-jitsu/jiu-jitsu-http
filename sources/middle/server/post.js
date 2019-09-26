
/**
 *
 */

const zlib = require(`zlib`)
const http2 = require(`http2`)

/**
 *
 */

const ___aes = require(`jiu-jitsu-aes`)
const ___zip = require(`jiu-jitsu-zip`)

/**
 *
 */

const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

/**
 *
 */

const router = (server, socket) => {

	/**
	 *
	 */

	const handlers = server.___post
	const next = handlers[socket.message.api]

	/**
	 *
	 */

	if (!next) {
		return socket.destroy()
	}

	/**
	 *
	 */

	next(socket)

}

/**
 *
 */

const onRequestClose = () => null

/**
 *
 */

const onRequestData = (server, socket, request, response, buffers, buffer) => buffers.push(buffer)

/**
 *
 */

const onRequestEnd = (server, socket, request, response, message) => {

	/**
	 *
	 */

	const options = server.___options

	/**
	 *
	 */

	try {

		/**
		 *
		 */

		message = Buffer.concat(message)

		/**
		 *
		 */

		if (request.headers[HTTP2_HEADER_CONTENT_ENCODING].indexOf(`gzip`) > -1) {
			message = zlib.unzipSync(message)
		}

		/**
		 *
		 */

		message = message.toString()
		message = options.key && ___aes.decrypt(message, options) || message
		message = options.key && ___zip.decrypt(message, options) || message
		message = JSON.parse(message)

		/**
		 *
		 */

	} catch (error) {

		/**
		 *
		 */

		return socket.destroy()

	}

	/**
	 *
	 */

	socket.message = {}
	socket.message.id = message.id
	socket.message.api = message.api
	socket.message.auth = message.auth
	socket.message.data = message.data

	/**
	 *
	 */

	router(server, socket, request, response)

}

/**
 *
 */

module.exports = (server, socket, request, response) => {

	/**
	 *
	 */

	const buffers = []

	/**
	 *
	 */

	request.on(`end`, (error) => onRequestEnd(server, socket, request, response, buffers, error))
	request.on(`data`, (buffer) => onRequestData(server, socket, request, response, buffers, buffer))
	request.on(`close`, (error) => onRequestClose(server, socket, request, response, buffers, error))

}

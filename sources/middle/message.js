
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

const router = (socket, request, response, options, apis) => {

	/**
	 *
	 */

	const next = apis[socket.message.api]

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

const onRequestClose = (socket, request, response, options, apis) => null

/**
 *
 */

const onRequestData = (socket, request, response, options, apis, buffers, buffer) => buffers.push(buffer)

/**
 *
 */

const onRequestEnd = (socket, request, response, options, apis, buffers) => {

	/**
	 *
	 */

	let message = Buffer.concat(buffers)

	/**
	 *
	 */

	try {

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

	} catch (cause) {

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

	router(socket, request, response, options, apis)

}

/**
 *
 */

module.exports = (socket, request, response, options, apis) => {

	/**
	 *
	 */

	const buffers = []

	/**
	 *
	 */

	request.on(`close`, (error) => onRequestClose(socket, request, response, options, apis, buffers))
	request.on(`data`, (buffer) => onRequestData(socket, request, response, options, apis, buffers, buffer))
	request.on(`end`, (error) => onRequestEnd(socket, request, response, options, apis, buffers))

}

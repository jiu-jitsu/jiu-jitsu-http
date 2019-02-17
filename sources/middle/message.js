
/**
 *
 */

const zlib = require('zlib')
const http2 = require('http2')

/**
 *
 */

const ___cry = require('../cry')
const ___zip = require('../zip')

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

		/**
		 *
		 */

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

const removeRequestListeners = (socket, request, response, options, apis) => {

	/**
	 *
	 */

	request.removeListener('end', onRequestEnd)
	request.removeListener('data', onRequestData)
	request.removeListener('close', onRequestClose)

}

/**
 *
 */

const onRequestClose = (socket, request, response, options, apis) => removeRequestListeners(socket, request, response, options, apis)

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

		if (request.headers[HTTP2_HEADER_CONTENT_ENCODING].indexOf('gzip') > -1) {

			/**
			 *
			 */

			message = zlib.unzipSync(message)

		}

		/**
		 *
		 */

		message = message.toString()
		message = options.key && ___cry.decrypt(message, options) || message
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

	removeRequestListeners(socket, request, response, options, apis)

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

	request.on('close', (error) => onRequestClose(socket, request, response, options, apis, buffers))
	request.on('data', (buffer) => onRequestData(socket, request, response, options, apis, buffers, buffer))
	request.on('end', (error) => onRequestEnd(socket, request, response, options, apis, buffers))

}



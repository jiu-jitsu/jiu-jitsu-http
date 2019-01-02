
/**
 * Native
 */

const zlib = require('zlib')

/**
 * Jiu-Jitsu
 */

const ___zip = require('jiu-jitsu-zip')
const ___crypto = require('jiu-jitsu-crypto')

/**
 * router
 */

const router = async (socket, request, response, options, apis) => {

	/**
	 * Next
	 */

	const next = apis[socket.message.api]

	/**
	 * Check
	 */

	if (!next) {

		/**
		 * Return
		 */

		return socket.destroy()

	}

	/**
	 * Return
	 */

	next(socket)

}

/**
 * removeRequestListeners
 */

const removeRequestListeners = (socket, request, response, options, apis) => {

	/**
	 * Listen
	 */

	request.removeListener('end', onRequestEnd)
	request.removeListener('data', onRequestData)
	request.removeListener('close', onRequestClose)

}

/**
 * onRequestClose
 */

const onRequestClose = (socket, request, response, options, apis) => removeRequestListeners(socket, request, response, options, apis)

/**
 * onRequestData
 */

const onRequestData = (socket, request, response, options, apis, buffers, buffer) => buffers.push(buffer)

/**
 * onRequestEnd
 */

const onRequestEnd = (socket, request, response, options, apis, buffers) => {

	/**
	 * Message
	 */

	let message = Buffer.concat(buffers)

	/**
	 * Check
	 */

	if (options.key) {

		try {

			message = message.toString()
			message = ___crypto.decrypt(message, options)
			message = ___zip.decrypt(message, options)
			message = JSON.parse(message)

		} catch (cause) {

			return socket.destroy()

		}

	}

	/**
	 * Check
	 */

	if (!options.key) {

		try {

			message = zlib.unzipSync(message)
			message = JSON.parse(message)

		} catch (cause) {

			return socket.destroy()

		}

	}

	/**
	 * Message
	 */

	socket.message = {}
	socket.message.id = message.id
	socket.message.api = message.api
	socket.message.auth = message.auth
	socket.message.data = message.data

	/**
	 * Remove
	 */

	removeRequestListeners(socket, request, response, options, apis)

	/**
	 * Router
	 */

	router(socket, request, response, options, apis)

}

/**
 * Export
 */

module.exports = (socket, request, response, options, apis) => {

	/**
	 * Buffers
	 */

	const buffers = []

	/**
	 * Listen
	 */

	request.on('close', (error) => onRequestClose(socket, request, response, options, apis, buffers))
	request.on('data', (buffer) => onRequestData(socket, request, response, options, apis, buffers, buffer))
	request.on('end', (error) => onRequestEnd(socket, request, response, options, apis, buffers))

}



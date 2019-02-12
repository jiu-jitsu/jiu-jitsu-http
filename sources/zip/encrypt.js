
/**
 *
 */

const zlib = require('zlib')

/**
 *
 */

module.exports = (message, options) => {

	/**
	 *
	 */

	if (message.constructor === Object) {

		message = JSON.stringify(message)

	}

	/**
	 *
	 */

	if (message.constructor === Array) {

		message = JSON.stringify(message)

	}

	/**
	 *
	 */

	return zlib.gzipSync(message).toString('binary')

}



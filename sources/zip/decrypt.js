
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

		return callback(null, message)

	} else if (message.constructor === Array) {

		return callback(null, message)

	} else {

		return zlib.unzipSync(Buffer.from(message, 'binary')).toString('utf8')

	}

}




/**
 *
 */

const crypto = require('crypto')

/**
 *
 */

module.exports = (message, options) => {

	/**
	 *
	 */

	const key = options.key

	/**
	 *
	 */

	const iv = crypto.randomBytes(16)

	/**
	 *
	 */

	const cipher = crypto.createCipheriv('aes256', key, iv)

	/**
	 *
	 */

	if (message.constructor === Object) {

		/**
		 *
		 */

		message = JSON.stringify(message)

	}

	/**
	 *
	 */

	if (message.constructor === Array) {

		/**
		 *
		 */

		message = JSON.stringify(message)

	}

	/**
	 *
	 */

	return `${iv.toString('binary')}${cipher.update(message, 'utf8', 'binary')}${cipher.final('binary')}`

}



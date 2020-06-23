
/**
 *
 */

const util = require(`util`)

/**
 *
 */

const middlePost = require(`./middle/client/post`)

/**
 *
 */

class Client {

	/**
	 *
	 */

	constructor (options) {

		/**
		 *
		 */

		this.get = util.promisify(this.get)
		this.file = util.promisify(this.file)
		this.message = util.promisify(this.message)

		/**
		 *
		 */

		this.___options = options
		this.___authority = `https://${options.host}:${options.port}`

	}

	/**
	 *
	 */

	get (url, callback) {}

	/**
	 *
	 */

	file (file, callback) {}

	/**
	 *
	 */

	message (message, callback) {
		middlePost(this, message, callback)
	}

}

/**
 *
 */

module.exports = Client

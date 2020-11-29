
/**
 *
 */

const middlePost = require("./middle/client/post")

/**
 *
 */

class Client {

	/**
	 *
	 */

	constructor (options) {
		this.___options = options
		this.___authority = `https://${options.host}:${options.port}`
	}

	/**
	 *
	 */

	async get (url) {}

	/**
	 *
	 */

	async file (file, callback) {}

	/**
	 *
	 */

	async message (message) {
		return middlePost(this, message)
	}

}

/**
 *
 */

module.exports = Client

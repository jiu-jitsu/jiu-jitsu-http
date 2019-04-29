
/**
 *
 */

module.exports = (key, cause) => {

	/**
	 *
	 */

	const date = new Date()
	const error = new Error()
	const stack = error.stack.split('\n').slice(2, 9).map((str) => str.trim())

	/**
	 *
	 */

	if (cause && cause.constructor.name.indexOf('Error') > -1) {

		/**
		 *
		 */

		cause = {
			message: cause.message,
			stack: cause.stack.split('\n').slice(1, 9).map((str) => str.trim())
		}

	}

	/**
	 *
	 */

	return {
		key,
		date,
		stack,
		cause
	}

}

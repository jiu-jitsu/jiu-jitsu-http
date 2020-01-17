
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
const ___error = require(`jiu-jitsu-error`)

/**
 *
 */

const HTTP2_SESSION_MAX_REQUESTS = Math.pow(2, 8)
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

/**
 *
 */

module.exports = (client, session, request, response, callback) => {
	request.on(`end`, (error) => onRequestEnd(client, session, request, response, error, callback))
	request.on(`data`, (buffer) => onRequestData(client, session, request, response, buffer, callback))
}

/**
 *
 */

const onRequestData = (client, session, request, response, buffer, callback) => response.buffers.push(buffer)

/**
 *
 */

const onRequestEnd = (client, session, request, response, error, callback) => {

	/**
	 *
	 */

	request.end()
	request.removeAllListeners(`end`)
	request.removeAllListeners(`data`)
	request.removeAllListeners(`error`)
	request.removeAllListeners(`close`)
	request.removeAllListeners(`response`)

	/**
	 *
	 */

	if (session.count >= HTTP2_SESSION_MAX_REQUESTS) {
		setTimeout(() => session.close())
	}

	/**
	 *
	 */

	try {

		/**
		 *
		 */

		response.message = Buffer.concat(response.buffers)

		/**
		 *
		 */

		if (response.headers[HTTP2_HEADER_CONTENT_ENCODING].indexOf(`gzip`) > -1) {
			response.message = zlib.unzipSync(response.message)
		}

		/**
		 *
		 */

		response.message = response.message.toString()
		response.message = client.options.key && ___aes.decrypt(response.message, client.options) || response.message
		response.message = client.options.key && ___zip.decrypt(response.message, client.options) || response.message
		response.message = JSON.parse(response.message)

		/**
		 *
		 */

	} catch (error) {

		/**
		 *
		 */

		error = ___error(null, `jiu-jitsu-http`, `FAIL`, `HTTP_POST_ERROR`, error)

		/**
		 *
		 */

		return callback(error)

	}

	/**
	 *
	 */

	return callback(null, response.message)

}

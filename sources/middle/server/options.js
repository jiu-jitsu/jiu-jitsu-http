
/**
 *
 */

const http2 = require("http2")

/**
 *
 */

const HTTPS_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN = http2.constants.HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN
const HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS = http2.constants.HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS

/**
 *
 */

module.exports = async (server, socket, stream, incomingHeaders, outgoingHeaders = {}) => {
	try {
		await make(server, socket, stream, incomingHeaders, outgoingHeaders)
	} catch (error) {
		stream.destroy()
	}
}

/**
 *
 */

const make = async (server, socket, stream, incomingHeaders, outgoingHeaders) => {

	/**
	 *
	 */

	outgoingHeaders[HTTPS_HEADER_STATUS] = 200
	outgoingHeaders[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN] = "*"
	outgoingHeaders[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS] = "*"

	/**
	 *
	 */

	stream.respond(outgoingHeaders)
	stream.end(null)

}

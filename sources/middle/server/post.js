
/**
 *
 */

const util = require("util")
const zlib = require("zlib")
const http2 = require("http2")

/**
 *
 */

const AES = require("jiu-jitsu-aes")
const ZIP = require("jiu-jitsu-zip")
const ERROR = require("jiu-jitsu-error")

/**
 *
 */

const HTTP2_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING
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

async function make (server, socket, stream, incomingHeaders, outgoingHeaders) {

	/**
	 *
	 */

	let incomingMessage
	let outgoingMessage

	/**
	 *
	 */

	const buffers = []
	const options = server.___options
	const handlers = server.___post
	const key = options.key

	/**
	 *
	 */

	for await (const buffer of stream) {
		buffers.push(buffer)
	}

	/**
	 *
	 */

	incomingMessage = Buffer.concat(buffers)

	/**
	 *
	 */

	incomingHeaders[HTTP2_HEADER_CONTENT_TYPE] = incomingHeaders[HTTP2_HEADER_CONTENT_TYPE] || ""
	incomingHeaders[HTTP2_HEADER_CONTENT_ENCODING] = incomingHeaders[HTTP2_HEADER_CONTENT_ENCODING] || ""

	/**
	 *
	 */

	if (incomingHeaders[HTTP2_HEADER_CONTENT_ENCODING].indexOf("gzip") > -1) {
		incomingMessage = await util.promisify(zlib.unzip)(incomingMessage)
	}

	/**
	 *
	 */

	incomingMessage = incomingMessage.toString()
	incomingMessage = key && await AES.decrypt(incomingMessage, key) || incomingMessage
	incomingMessage = key && await ZIP.decrypt(incomingMessage, key) || incomingMessage
	incomingMessage = JSON.parse(incomingMessage)

	/**
	 *
	 */

	const handler = handlers[incomingMessage.api]

	/**
	 *
	 */

	if (!handler) {
		throw new ERROR("jiu-jitsu-http|HTTP_HANDLER_NOT_FOUND", "ERROR")
	}

	/**
	 *
	 */

	socket.request = incomingMessage

	/**
	 *
	 */

	await handler(socket)

	/**
	 *
	 */

	if (stream.closed) {
		return
	}

	/**
	 *
	 */

	outgoingMessage = socket.response

	/**
	 *
	 */

	outgoingMessage = JSON.stringify(outgoingMessage)
	outgoingMessage = key && await ZIP.encrypt(outgoingMessage, key) || outgoingMessage
	outgoingMessage = key && await AES.encrypt(outgoingMessage, key) || outgoingMessage
	outgoingMessage = await util.promisify(zlib.gzip)(outgoingMessage)

	/**
	 *
	 */

	outgoingHeaders[HTTP2_HEADER_STATUS] = 200
	outgoingHeaders[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN] = "*"
	outgoingHeaders[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS] = "*"
	outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = "application/json"
	outgoingHeaders[HTTP2_HEADER_CONTENT_ENCODING] = "gzip"

	/**
	 *
	 */

	stream.respond(outgoingHeaders)
	stream.write(outgoingMessage)
	stream.end(null)

}


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

const make = async (server, socket, stream, incomingHeaders, outgoingHeaders) => {

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

	if (incomingHeaders[HTTP2_HEADER_CONTENT_ENCODING].indexOf(`gzip`) > -1) {
		incomingMessage = zlib.unzipSync(incomingMessage)
	}

	/**
	 *
	 */

	incomingMessage = incomingMessage.toString()
	incomingMessage = options.key && ___aes.decrypt(incomingMessage, options) || incomingMessage
	incomingMessage = options.key && ___zip.decrypt(incomingMessage, options) || incomingMessage
	incomingMessage = JSON.parse(incomingMessage)

	/**
	 *
	 */

	const handler = handlers[incomingMessage.api]

	/**
	 *
	 */

	if (!handler) {
		throw ___error(`jiu-jitsu-http`, `FAIL`, `HANDLER_NOT_FOUND`)
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
	outgoingMessage = options.key && ___zip.encrypt(outgoingMessage, options) || outgoingMessage
	outgoingMessage = options.key && ___aes.encrypt(outgoingMessage, options) || outgoingMessage
	outgoingMessage = zlib.gzipSync(outgoingMessage)

	/**
	 *
	 */

	outgoingHeaders[HTTP2_HEADER_STATUS] = 200
	outgoingHeaders[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN] = `*`
	outgoingHeaders[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS] = `*`
	outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = `application/json`
	outgoingHeaders[HTTP2_HEADER_CONTENT_ENCODING] = `gzip`

	/**
	 *
	 */

	stream.respond(outgoingHeaders)
	stream.write(outgoingMessage)
	stream.end(null)

}

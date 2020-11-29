
/**
 *
 */

const fs = require("fs")
const zlib = require("zlib")
const http2 = require("http2")

/**
 *
 */

const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_CACHE_CONTROL = http2.constants.HTTP2_HEADER_CACHE_CONTROL
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

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

	if (incomingHeaders[HTTP2_HEADER_PATH] === "/favicon.ico") {
		return stream.destroy()
	}

	/**
	 *
	 */

	const handlers = server.___get
	const handler = handlers["*"]

	/**
	 *
	 */

	if (!handler) {
		throw ___error("jiu-jitsu-http", "FAIL", "HTTP_HANDLER_NOT_FOUND")
	}

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
	 * file: {
	 *  source: String,
	 *  type: String,
	 *  path: String,
	 *  push: Boolean,
	 *  zip: Boolean
	 * }
	 */

	const files = socket.response

	/**
	 *
	 */

	for (const file of files) {

		/**
		 *
		 */

		file.type =
			file.source.lastIndexOf(".html") > -1 && "text/html" ||
			file.source.lastIndexOf(".js") > -1 && "text/javascript" ||
			file.source.lastIndexOf(".jpg") > -1 && "image/jpeg" ||
			file.source.lastIndexOf(".ico") > -1 && "image/x-icon" ||
			file.source.lastIndexOf(".woff2") > -1 && "font/woff2"

		/**
		 *
		 */

		if (!file.push) {
			sendFile(server, socket, stream, incomingHeaders, {}, file)
		} else {
			const pushHeaders = {}
			const pushOptions = {}
			pushHeaders[HTTP2_HEADER_PATH] = file.source
			pushHeaders[HTTP2_HEADER_CONTENT_TYPE] = file.type
			pushOptions.parent = stream.id
			stream.pushStream(pushHeaders, pushOptions, (error, pushStream) => sendFile(server, socket, pushStream, incomingHeaders, {}, file))
		}
	}

}

/**
 *
 */

const sendFile = (server, socket, stream, incomingHeaders, outgoingHeaders = {}, file) => {

	/**
	 *
	 */

	const fileGzipStream = zlib.createGzip()
	const fileReadStream = fs.createReadStream(file.path)

	/**
	 *
	 */

	if (!file.push) {
		outgoingHeaders[HTTP2_HEADER_STATUS] = 200
		outgoingHeaders[HTTP2_HEADER_CACHE_CONTROL] = "no-store"
		outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = file.type
	} else {
		outgoingHeaders[HTTP2_HEADER_CACHE_CONTROL] = "no-store"
		outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = file.type
	}

	/**
	 *
	 */

	if (file.zip) {
		outgoingHeaders[HTTP2_HEADER_CONTENT_ENCODING] = "gzip"
	}

	/**
	 *
	 */

	stream.on("error", (error) => error)
	stream.respond(outgoingHeaders)

	/**
	 *
	 */

	fileGzipStream.on("error", (error) => error)
	fileReadStream.on("error", (error) => error)

	/**
	 *
	 */

	file.zip
		? fileReadStream.pipe(fileGzipStream).pipe(stream)
		: fileReadStream.pipe(stream)

}

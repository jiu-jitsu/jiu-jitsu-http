
/**
 *
 */

const util = require("util")
const zlib = require("zlib")
const http2 = require("http2")

/**
 *
 */

const ___aes = require("jiu-jitsu-aes")
const ___zip = require("jiu-jitsu-zip")
const ___uuid = require("jiu-jitsu-uuid")
const ___error = require("jiu-jitsu-error")

/**
 *
 */

const HTTP2_OPTIONS = {}
const HTTP2_SESSIONS = {}
const HTTP2_OUTGOING_HEADERS = {}

/**
 *
 */

const HTTP2_SESSION_TIMEOUT = 86400000
const HTTP2_SESSION_TIMEOUT_AFTER_USAGE = 16000
const HTTP2_SESSION_MAX_REQUESTS = 256
const HTTP2_SESSION_MAX_LISTENERS = 1024

/**
 *
 */

const HTTP2_HEADER_PATH = http2.constants.HTTP2_HEADER_PATH
const HTTP2_HEADER_METHOD = http2.constants.HTTP2_HEADER_METHOD
const HTTP2_HEADER_STATUS = http2.constants.HTTP2_HEADER_STATUS
const HTTP2_HEADER_CONTENT_TYPE = http2.constants.HTTP2_HEADER_CONTENT_TYPE
const HTTP2_HEADER_ACCEPT_ENCODING = http2.constants.HTTP2_HEADER_ACCEPT_ENCODING
const HTTP2_HEADER_CONTENT_ENCODING = http2.constants.HTTP2_HEADER_CONTENT_ENCODING

/**
 *
 */

HTTP2_OPTIONS.requestCert = true
HTTP2_OPTIONS.rejectUnauthorized = false
HTTP2_OPTIONS.maxSessionMemory = 256
HTTP2_OPTIONS.peerMaxConcurrentStreams = 64000

/**
 *
 */

HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_PATH] = "/"
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_METHOD] = "POST"
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_ACCEPT_ENCODING] = "gzip"
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_CONTENT_ENCODING] = "gzip"
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_CONTENT_TYPE] = "application/json"

/**
 *
 */

module.exports = async (client, outgoingMessage, incomingMessage) => {

	/**
	 *
	 */

	let stream
	let session

	/**
	 *
	 */

	const options = client.___options
	const authority = client.___authority

	/**
	 *
	 */

	outgoingMessage = JSON.stringify(outgoingMessage)
	outgoingMessage = options.key && await ___zip.encrypt(outgoingMessage, options) || outgoingMessage
	outgoingMessage = options.key && await ___aes.encrypt(outgoingMessage, options) || outgoingMessage
	outgoingMessage = await util.promisify(zlib.gzip)(outgoingMessage)

	/**
	 *
	 */

	session = HTTP2_SESSIONS[authority]

	/**
	 *
	 */

	if (session && session.closed) {
		session = undefined
	}

	/**
	 *
	 */

	if (session && session.destroyed) {
		session = undefined
	}

	/**
	 *
	 */

	if (session && ++session.count > HTTP2_SESSION_MAX_REQUESTS) {
		session.setTimeout(HTTP2_SESSION_TIMEOUT_AFTER_USAGE)
		session = undefined
	}

	/**
	 *
	 */

	if (!session) {
		session = http2.connect(authority, HTTP2_OPTIONS)
		session.id = ___uuid()
		session.count = 1
		session.setTimeout(HTTP2_SESSION_TIMEOUT)
		session.setMaxListeners(HTTP2_SESSION_MAX_LISTENERS)
		session.once("error", (error) => session.destroy(error))
		session.once("timeout", (error) => session.destroy(error))
	}

	/**
	 *
	 */

	HTTP2_SESSIONS[authority] = session

	/**
	 *
	 */

	stream = session.request(HTTP2_OUTGOING_HEADERS)

	/**
	 *
	 */

	const incomingHeaders = await new Promise((resolve, reject) => {
		stream.once("error", (error) => reject(error))
		stream.once("close", (error) => reject(error))
		stream.once("response", (incomingHeaders) => resolve(incomingHeaders))
		stream.write(outgoingMessage)
		stream.end(null)
	})

	/**
	 *
	 */

	incomingHeaders[HTTP2_HEADER_CONTENT_TYPE] = incomingHeaders[HTTP2_HEADER_CONTENT_TYPE] || ""
	incomingHeaders[HTTP2_HEADER_CONTENT_ENCODING] = incomingHeaders[HTTP2_HEADER_CONTENT_ENCODING] || ""

	/**
	 *
	 */

	const incomingStatus = incomingHeaders[HTTP2_HEADER_STATUS]

	/**
	 *
	 */

	if (incomingStatus > 200) {
		throw ___error("jiu-jitsu-http", "FAIL", "HTTP_RESPONSE_HEADER_STATUS", incomingStatus)
	}

	/**
	 *
	 */

	const buffers = []

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

	if (incomingHeaders[HTTP2_HEADER_CONTENT_ENCODING].indexOf("gzip") > -1) {
		incomingMessage = await util.promisify(zlib.unzip)(incomingMessage)
	}

	/**
	 *
	 */

	incomingMessage = incomingMessage.toString()
	incomingMessage = options.key && await ___aes.decrypt(incomingMessage, options) || incomingMessage
	incomingMessage = options.key && await ___zip.decrypt(incomingMessage, options) || incomingMessage
	incomingMessage = JSON.parse(incomingMessage)

	/**
	 *
	 */

	return incomingMessage

}

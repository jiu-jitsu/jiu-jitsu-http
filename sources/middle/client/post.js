
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
const ___uuid = require(`jiu-jitsu-uuid`)
const ___error = require(`jiu-jitsu-error`)

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

HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_PATH] = `/`
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_METHOD] = `POST`
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_ACCEPT_ENCODING] = `gzip`
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_CONTENT_ENCODING] = `gzip`
HTTP2_OUTGOING_HEADERS[HTTP2_HEADER_CONTENT_TYPE] = `application/json`

/**
 *
 */

module.exports = (client, outgoingMessage, callback) => {

	/**
	 *
	 */

	let session
	let stream

	/**
	 *
	 */

	const options = client.___options
	const authority = client.___authority

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
		session.once(`error`, (error) => ___onSessionError(client, session, error))
		session.once(`timeout`, (error) => ___onSessionTimeout(client, session, error))
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

	stream.once(`error`, (error) => ___onStreamError(client, session, stream, error, callback))
	stream.once(`close`, (error) => ___onStreamClose(client, session, stream, error, callback))
	stream.once(`response`, (incomingHeaders) => ___onStreamResponse(client, session, stream, incomingHeaders, callback))

	/**
	 *
	 */

	stream.write(outgoingMessage)
	stream.end(null)

}

/**
 *
 */

const ___onSessionError = (client, session, error) => {
	session.close()
	session.destroy()
}

/**
 *
 */

const ___onSessionTimeout = (client, session, error) => {
	session.close()
	session.destroy()
}

/**
 *
 */

const ___onStreamError = (client, session, stream, error, callback) => {
	error = ___error(`jiu-jitsu-http`, `FAIL`, `HTTP_STREAM_ERROR`, error)
	callback(error)
}

/**
 *
 */

const ___onStreamClose = (client, session, stream, error, callback) => {
	error = ___error(`jiu-jitsu-http`, `FAIL`, `HTTP_STREAM_CLOSE`, error)
	callback(error)
}

/**
 *
 */

const ___onStreamResponse = (client, session, stream, incomingHeaders, callback) => {

	/**
	 *
	 */

	const status = incomingHeaders[HTTP2_HEADER_STATUS]
	const incomingMessage = []

	/**
	 *
	 */

	if (status > 200) {
		stream.end()
		const error = ___error(`jiu-jitsu-http`, `FAIL`, `HTTP_RESPONSE_HEADER_STATUS`, status)
		return callback(error)
	}

	/**
	 *
	 */

	stream.on(`data`, (data) => ___onStreamData(client, session, stream, incomingHeaders, incomingMessage, data, callback))
	stream.on(`end`, (error) => ___onStreamEnd(client, session, stream, incomingHeaders, incomingMessage, error, callback))

}

/**
 *
 */

const ___onStreamData = (client, session, stream, incomingHeaders, incomingMessage, data, callback) => {
	incomingMessage.push(data)
}

/**
 *
 */

const ___onStreamEnd = (client, session, stream, incomingHeaders, incomingMessage, error, callback) => {

	/**
	 *
	 */

	const options = client.___options

	/**
	 *
	 */

	try {

		/**
		 *
		 */

		incomingMessage = Buffer.concat(incomingMessage)

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

	} catch (error) {

		/**
		 *
		 */

		error = ___error(`jiu-jitsu-http`, `FAIL`, `HTTP_POST_ERROR`, error)

		/**
		 *
		 */

		return callback(error)

	}

	/**
	 *
	 */

	return callback(null, incomingMessage)

}

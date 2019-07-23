
/**
 *
 */

const router = (server, socket, request, response) => {

	/**
	 *
	 */

	const handlers = server.___get

	/**
	 *
	 */

	if (!handlers[request.url.pathname] && request.url.pathname === `/favicon.ico`) {
		response.writeHead(200)
		response.end()
		return
	}

	/**
	 *
	 */

	if (!handlers[request.url.pathname] && handlers[`*`]) {
		handlers[`*`](socket)
		return
	}

	/**
	 *
	 */

	if (handlers[request.url.pathname]) {
		handlers[request.url.pathname](socket)
		return
	}

	/**
	 *
	 */

	socket.destroy()

}

/**
 *
 */

module.exports = router


/**
 *
 */

module.exports = require(`./sources`)

const server = new module.exports.server({
	post: 3333,
	host: '127.0.0.1'
})

server.on('ready', () => console.log('ready'))

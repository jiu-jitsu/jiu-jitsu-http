
/**
 *
 */

const salt = () => Math.random().toString(36).substring(2, 18)

/**
 *
 */

module.exports = () => ('UUID' + salt() + Date.now().toString(36) + salt()).substr(0, 32).toUpperCase()

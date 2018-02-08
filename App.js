require('dotenv').config()

const count = require('server-count')
const { Server } = require('http')
const server = new Server(count)
console.log(process.env.NODE_PATH);
server.listen(8000)

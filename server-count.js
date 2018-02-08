require('dotenv').config()

let i = 0

const count = (req, res) => {
  i++
  res.end(i.toString())
}

module.exports = count


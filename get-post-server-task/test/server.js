const assert = require('assert')
const server = require('../server')
const request = require('request')
const fs = require('fs')

describe('server tests', () => {
  let app

  before(done => {
    app = server.listen(3000, done)
  })

  after(done => app.close(done))

  it('should return index.html', done => {
    /*
      1. запустить сервер (before)
      2. сделать запрос
      3. прочесть файл с диска
      4. дождаться ответа от сервера
      5. сравнить файл с диска с тем, что пришел с сервера
    */

    request('http://localhost:3000', (err, res, body) => {
      if (err) return done(err)

      const file = fs.readFileSync('public/index.html', { encoding: 'utf-8' })
      assert.equal(body, file)

      done()
    })
  })
})

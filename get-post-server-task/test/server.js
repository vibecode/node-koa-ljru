/* global describe, context, it, before, after, beforeEach  */

// (!!!) encoding: null to get buffer,
// https://github.com/request/request/issues/823#issuecomment-59208292

// simple: false means that we don't want to reject promise if response.statusCode not 2..

const request = require('request-promise').defaults({
  encoding: null,
  simple: false,
  resolveWithFullResponse: true
})

const fs = require('fs-extra')
const config = require('config')
const Readable = require('stream').Readable;

const host = 'http://127.0.0.1:3000';

const server = require('../server')

// not in config, because many test dirs are possible
const fixturesRoot = __dirname + '/fixtures';

describe('Server', () => {
  before(done => {
    server.listen(3000, '127.0.0.1', done)
  })

  after(done => {
    server.close(done)
  })

  beforeEach(() => {
    fs.emptyDirSync(config.get('filesRoot'))
  })

  describe('GET /file.ext', () =>{
    context('When exists', () => {
      beforeEach(() => {
        // 'before' will not do here,
        // because it works 'before tests'
        // and parent beforeEach works 'before each test', that is after before
        fs.copySync(`${fixturesRoot}/small.png`, config.get('filesRoot') + '/small.png');
      });

      it('returns 200 & the file', async function () {
        let fixtureContent = fs.readFileSync(`${fixturesRoot}/small.png`);

        const response = await request.get(`${host}/small.png`);

        response.body.equals(fixtureContent).should.be.true();
      });
    });

    context('otherwise', () => {
      it('returns 404', async function () {

        const response = await request.get(`${host}/small.png`);

        response.statusCode.should.be.equal(404);
      });
    });
  })
})
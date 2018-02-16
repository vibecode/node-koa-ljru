const http = require('http')
const fs = require('fs')
const url = require('url');

let clients = []

const server = http.createServer((req, res) => {

  const urlPath = url.parse(req.url).pathname;

  switch (req.method + ' ' + urlPath) {
    case 'GET /':
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      sendFile("index.html", res);
      break

    case 'GET /subscribe':
      console.log('subscribe')
      // ----> при закрытии соединения, оно убирается из clients
      res.on('close', () => {
        clients.splice(clients.indexOf(res), 1)
      })

      clients.push(res)
      break

    case  'POST /publish':
      // -----> запрос может быть разбит посередине utf-символа (запрос может быть бинарным, default encoding нет)
      req.setEncoding('utf-8');

      let body = ''

      req
          .on('data', data => {
            // -----> размер body может быть слишком большим
            body += data

            if (body.length > 512) {
              //413 Payload Too Large (RFC 7231)
              //The request is larger than the server is willing or able to process. Previously called "Request Entity Too Large".
              res.statusCode = 413
              res.end("Message is too big")
            }
          })
          .on('end', () => {

            // ----> некорректный JSON выдаст исключение и повалит сервер
            try {
              body = JSON.parse(body)

              if(!body.message) {
                throw new SyntaxError("No message")
              }

              // ---> если body.message не существует
              // или не строка, а, к примеру, число, то res.end вылетит с ошибкой
              body.message = String(body.message)
            } catch (e) {
              //400 Bad Request
              //The server cannot or will not process the request due to an apparent client error
              //(e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing)
              res.statusCode = 400
              res.end("Bad request")
              return
            }

            // заметим: не может быть,
            // чтобы в процессе этого цикла добавились новые соединения или закрылись текущие
            clients.forEach(res => {
              // ----> добавляем no-cache заголовки, чтобы GET не кешировало
              res.setHeader('Cache-Control', "no-cache, no-store, private")
              res.end(body.message);
            });

            clients.length = 0

            res.end("ok");
          })
      break
    default:
      res.statusCode = 404
      res.end("Not found")
  }
})

server.listen(3000, () => console.log('listening 3000'))

module.exports = server

function sendFile(filepath, res) {
  const fileStream = fs.createReadStream(filepath)
  fileStream.pipe(res)
  // ----> обработать ошибку при чтении файла
  // ----> обработать закрытие соединение (файл не должен оставаться открытым)
  // ----> указать Content-Type: text/html
  fileStream
      .on('error', err => {
        if (err.code === 'ENOENT') {
          res.statusCode = 404
          res.end('File not found')
        } else {
          console.error(err);

          if (!res.headersSent) {
            //500 Internal Server Error
            //A generic error message, given when an unexpected condition was encountered
            //and no more specific message is suitable.
            res.statusCode = 500
            res.end("Server Error")
          } else {
            res.end()
          }
        }
      })

  //if connection was broken by client
  res.on('close', () => fileStream.destroy())
}
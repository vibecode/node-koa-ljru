/**
 ЗАДАЧА - научиться работать с потоками (streams)
 Написать HTTP-сервер для загрузки и получения файлов
 - Все файлы находятся в директории files
 - Структура файлов НЕ вложенная.

 - Виды запросов к серверу
 GET /file.ext
 - выдаёт файл file.ext из директории files,

 POST /file.ext
 - пишет всё тело запроса в файл files/file.ext и выдаёт ОК
 - если файл уже есть, то выдаёт ошибку 409
 - при превышении файлом размера 1MB выдаёт ошибку 413

 DELETE /file
 - удаляет файл
 - выводит 200 OK
 - если файла нет, то ошибка 404

 Вместо file может быть любое имя файла.
 Так как поддиректорий нет, то при наличии / или .. в пути сервер должен выдавать ошибку 400.

 - Сервер должен корректно обрабатывать ошибки "файл не найден" и другие (ошибка чтения файла)
 - index.html или curl для тестирования

 */


'use strict';

const http = require('http')
const url = require('url')
const path = require('path')
const fs = require('fs')
const mime = require('mime')
const config = require('config')

http.createServer((req, res) => {

  const pathname = decodeURI(url.parse(req.url).pathname);
  const filename = pathname.slice(1) // /file.ext => file.ext

  if (filename.includes('/') || filename.includes('..')) {
    //400 Bad Request
    //The server cannot or will not process the request due to an apparent client error
    //(e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing)
    res.statusCode = 400
    res.end('Nested path are not allowed')
    return
  }

  switch (req.method) {
    case 'GET':
      if (pathname === '/') {
        sendFile(config.get('publicRoot') + '/index.html', res)
      } else {
        const filePath = path.join(config.get('filesRoot'), filename)
        sendFile(filePath, res)
      }
      break
    case 'POST':
      if (!filename) {
        res.statusCode = 404
        res.end('File not found')
      }

      receiveFile(path.join(config.get('filesRoot'), filename), req, res)
      break
    default:
      //502 Bad Gateway
      //The server was acting as a gateway or proxy and received an invalid response from the upstream server.
      res.statusCode = 502;
      res.end("Not implemented");
  }

}).listen(3000);

function receiveFile(filepath, req, res) {
  let size = 0

  // flags:
  // 'w' - Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
  // 'wx' - Like 'w' but fails if path exists.
  const writeStream = fs.createWriteStream(filepath, { flags: 'wx' })

  req
      .on('data', chunk => {
        size += chunk.length

        if (size > config.get('limitFileSize')) {
          //413 Payload Too Large (RFC 7231)
          //The request is larger than the server is willing or able to process. Previously called "Request Entity Too Large".
          res.statusCode = 413

          // if we just res.end w/o connection close, browser may keep on sending the file
          // the connection will be kept alive, and the browser will hang (trying to send more data)
          // this header tells node to close the connection
          // also see http://stackoverflow.com/questions/18367824/how-to-cancel-http-upload-from-data-events/18370751#18370751
          res.setHeader('Connection', 'close')

          // Some browsers will handle this as 'CONNECTION RESET' error
          res.end('File is too big!');

          writeStream.destroy()
          fs.unlink(filepath, err => {
            //ignore error
          })
        }
      })
      .on('close', () => {
        writeStream.destroy()
        fs.unlink(filepath, err => {
          //ignore error
        })
      })
      .pipe(writeStream)

  writeStream
      .on('error', err => {
        if (err.code === 'EEXIST') {
          //409 Conflict
          //Indicates that the request could not be processed because of conflict in the request,
          //such as an edit conflict between multiple simultaneous updates.
          res.statusCode = 409
          res.end('File already exists')
        } else {
          console.error(err)

          if (!res.headersSent) {
            res.writeHead(500, { 'Connection': 'close' })
            res.write('Internal error')
          }
          fs.unlink(filepath, err => {
            //ignore error

            res.end()
          })
        }
      })
      .on('close', () => {
        // Note: can't use on('finish')
        // finish = data flushed, for zero files happens immediately,
        // even before 'file exists' check

        // for zero files the event sequence may be:
        //   finish -> error

        // we must use 'close' event to track if the file has really been written down
        res.end('OK');
      })

  res.on('finish', () => console.log('finish'));
}

function sendFile(filepath, res) {
  const fileStream = fs.createReadStream(filepath)
  fileStream.pipe(res)

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
            //and no more specific message is suitable.[61]
            res.statusCode = 500
            res.end("Server Error")
          } else {
            res.end()
          }
        }
      })
      .on('open', () => {
        // res.setHeader('Content-Type', mime.getType(filepath))
        console.log('open');
      })

  //if connection was broken by client
  res.on('close', () => file.destroy())
}

// function sendFile(file, res) {
//   file.on('readable', write)
//
//   function write() {
//     const fileContent = file.read() //считать
//
//
//     //если res принимает данные очень быстро то res.write возвращает true
//     //если буфер переполнен write.res вернет false и мы временно отказываемся
//     //обрабатывать событие readable на файле
//     if (fileContent && !res.write(fileContent)) {
//       file.removeListener('readable', write)
//
//       res.once('drain', () => { //подождать drain
//         file.on('readable', write)
//         write()
//       })
//     }
//
//     file.on('end', () => {
//       res.end()
//     })
//   }
// }
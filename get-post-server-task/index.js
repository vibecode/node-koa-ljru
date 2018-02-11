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

// Пример простого сервера в качестве основы

'use strict';

const http = require('http')
const url = require('url');
const fs = require('fs');

http.createServer((req, res) => {
  
  let pathname = decodeURI(url.parse(req.url).pathname);

  switch(req.method) {
  case 'GET':
    if (pathname == '/') {
      const index = fs.readStream(__dirname + '/public/index.html')
      sendFile(index, res)

      return
    }

  default:
    res.statusCode = 502;
    res.end("Not implemented");
  }

}).listen(3000);

function sendFile(file, res) {
  file.on('readable', write)

  function write() {
    const fileContent = file.read() //считать


    //если res принимает данные очень быстро то res.write возвращает true
    //если буфер переполнен write.res вернет false и мы временно отказываемся
    //обрабатывать событие readable на файле
    if (fileContent && !res.write(fileContent)) {
      file.removeListener('readable', write)

      res.once('drain', () => { //подождать drain
        file.on('readable', write)
        write()
      })
    }

    file.on('end' () => {
      res.end()
    })
  }
}

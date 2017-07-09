#! /usr/bin/env node

// @flow
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json({ limit: '50mb' }))
const findit = require('findit')
const getPort = require('get-port')
const open = require('open')

const updateNotifier = require('update-notifier')
const pkg = require('./package.json')

let localConf = {}

try {
  localConf = require(path.join(process.cwd(),'trainer_conf.json'))
}catch(e){
  console.log('no local configuration file found or you’re not running rasa trainer in you rasa installation folder')
}

updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // one day
}).notify()

const fs = require('fs')
const argv = require('yargs')
  .usage('This is my awesome program\n\nUsage: $0 [options]')
  .help('help').alias('help', 'h')
  .options({
    source: {
      alias: 's',
      description: '<filename> A json file in native rasa-nlu format',
      requiresArg: true,
    },
    port: {
      alias: 'p',
      description: '<port> Port to listen on',
      requiresArg: true,
    },
    development: {
      alias: 'd',
    }
  })
  .default({
    source: null,
    port: null,
    development: false,
  })
  .argv

const sourceFile = {
  path: '',
  data: {},
  isLoaded: false,
}

function readData(path, isSourceReading = true) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (error, raw) => {
      let json

      if (error) {
        return reject(`Can't read file "${path}"\n${error}`)
      }

      try {
        json = JSON.parse(raw)
      }
      catch (error) {
        return reject(`Can't parse json file "${path}"\n${error}`)
      }

      if (isSourceReading && !json.rasa_nlu_data) {
        return reject('"rasa_nlu_data" is undefined')
      }

      resolve(json)
    })
  })
}

let source = (localConf && localConf.source) ? localConf.source : argv.source

if (source) {
  readData(source)
    .then(data => {
      sourceFile.data = data,
      sourceFile.path = source
      sourceFile.isLoaded = true
      serve()
    })
    .catch(error => {
      throw error
    })
}
else {
  console.log('searching for the training examples...')
  let isSearchingOver = false
  let inReading = 0

  function checkDone() {
    if (isSearchingOver && inReading === 0) {
      if (!sourceFile.isLoaded) {
        throw new Error(`Can't find training file, please try to specify it with the --source option or in a "trainer_conf.json" file`)
      }
      else {
        serve()
      }
    }
  }

  const finder = findit(process.cwd())
  finder.on('directory', function (dir, stat, stop) {
    var base = path.basename(dir)
    if (base === '.git' || base === 'node_modules') stop()
  })

  finder.on('file', function (file) {
    if (file.substr(-5) === '.json' && !sourceFile.isLoaded) {

      inReading++
      readData(file)
        .then(data => {
          if (!sourceFile.isLoaded) { // an other file could have been loaded in the meantime
            sourceFile.data = data,
            sourceFile.path = file
            sourceFile.isLoaded = true
            console.log(`found ${file}`)
          }
        })
        .catch(() => {})
        .then(() => {
          inReading--
          checkDone()
        })
    }
  })

  finder.on('end', function () {
    isSearchingOver = true
    checkDone()
  })
}

function serve() {
  // app.use(express.static('./build'))

  app.use(express.static(path.join(__dirname, './build')))

  if (process.env.NODE_ENV !== 'production') {
    //the dev server is running on an other port
    app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })
  }

  if (!argv.development) {
    app.get('/', function (req, res) {
      res.sendFile(path.join(__dirname, './build', 'index.html'))
    })
  }

  app.post('/data', function (req, res) {
    res.json({
      data: sourceFile.data,
      path: sourceFile.path,
    })
  })

  app.post('/save', function (req, res) {
    const data = req.body
    if (!data || !data.rasa_nlu_data) {
      res.json({error: 'file is invalid'})
    }
    fs.writeFile(sourceFile.path, JSON.stringify(data, null, 2), (error) => {
      if (error) {
        return res.json({error})
      }
      readData(sourceFile.path)
        .then(json => sourceFile.data = json)
        .catch(error => console.error(error))
        .then(() => {
          if (localConf.pending_file) {
            cleanPendings(data)
              .then(() => res.json({ok: true}))
              .catch(error => console.error(error))
          } else {
            res.json({ok: true})
          }
        })
    })
  })

  app.get('/get-pending', function(req, res){
    if (!localConf || !localConf.pending_file) {
      res.json({
        data: {}
      })
    } else {
      readData(localConf.pending_file, false)
        .then(json => {
          res.json({
            data: json
          })
        })
        .catch(error => console.error(error))
    }
  })

  if (argv.port) {
    listen(argv.port)
  }
  else {
    getPort().then(port => listen(port))
  }

  function listen(port) {
    app.listen(port)
    if (!argv.development) {
      const url = `http://localhost:${port}/`
      console.log(`server listening at ${url}`)
      open(url)
    }
    else {
      console.log('dev server listening at', port)
    }
  }

  function cleanPendings(newStrings) {
    return new Promise(function(resolve, reject) {
      readData(localConf.pending_file, false)
        .then(json => {
          const pendingStringCleaned = {}
          Object.keys(json).forEach(function(key){
            const string = json[key]
            let stringExample = newStrings.rasa_nlu_data.common_examples.find(function(example){
              return example.text === string
            })
            if (!stringExample) {
              pendingStringCleaned[key] = string
            }
          })

          fs.writeFile(localConf.pending_file, JSON.stringify(pendingStringCleaned), (error) => {
            if (error) {
              return reject(error)
            }
            
            resolve()
          })
        })
        .catch(error => console.error(error))
    })
  }
}

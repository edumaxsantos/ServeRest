'use strict'

const express = require('express')
const logger = require('morgan')
const moesif = require('moesif-express')
const os = require('os')
const queryParser = require('express-query-int')
const timeout = require('connect-timeout')

const { conf } = require('./utils/conf')
const { DOC_URL } = require('./utils/constants')
const montarMensagemDeErroDeSchema = require('./utils/montarMensagemDeErroDeSchema')

const ehAmbienteDeDesenvolvimento = process.env.NODE_ENV === 'serverest-development'
const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'
/* istanbul ignore next */
const moesifMiddleware = moesif({
  applicationId: 'eyJhcHAiOiIxNTA6MTU1MCIsInZlciI6IjIuMCIsIm9yZyI6IjQ5MToxMTIxIiwiaWF0IjoxNTk4OTE4NDAwfQ.e0E6Qhz1o1Jjs5prulHDYEBlv0juruWs_btjq2mong8',
  identifyUser: (req, res) => { return os.userInfo().username }
})

const app = express()

app.set('json spaces', 4)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(queryParser())
app.use(timeout())

/* istanbul ignore else */
if (!conf.semHeaderDeSeguranca) {
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.set('x-dns-prefetch-control', 'off')
    res.set('x-frame-options', 'SAMEORIGIN')
    res.set('strict-transport-security', 'max-age=15552000; includeSubDomains')
    res.set('x-download-options', 'noopen')
    res.set('x-content-type-options', 'nosniff')
    res.set('x-xss-protection', '1; mode=block')
    next()
  })
}

app.get('/favicon.ico', (req, res) => { res.sendStatus(200) })

/* istanbul ignore if */
if (!ehAmbienteDeDesenvolvimento && !ehAmbienteDeTestes) {
  app.use(moesifMiddleware)
}

/* istanbul ignore if */
if (!ehAmbienteDeTestes) {
  app.use(logger('dev'))
}

app.use('/login', require('./routes/login-route'))
app.use('/usuarios', require('./routes/usuarios-route'))
app.use('/produtos', require('./routes/produtos-route'))
app.use('/carrinhos', require('./routes/carrinhos-route'))

app.use((error, req, res, next) => {
  const erroDeSchema = error.name === 'ValidationError'
  /* istanbul ignore else */
  if (erroDeSchema) {
    return res.status(400).json(montarMensagemDeErroDeSchema(error))
  } else {
    return res.status(500).json({ error })
  }
})

app.use((req, res) => {
  res.status(405).send({
    message: `Não é possível realizar ${req.method} em ${req.url}. Acesse ${DOC_URL} para ver as rotas disponíveis e como utilizá-las.`
  })
})

module.exports = app

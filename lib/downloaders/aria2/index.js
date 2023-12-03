const debug = require('debug')('patbrid:downloaders:aria2')
const rpc = require('node-json-rpc')
const { URL } = require('url')

class Aria2Downloader {
  constructor (url, secret) {
    debug('ctor', url, secret)

    this.url = url
    this.secret = secret
    this.id = 0

    const rpcUrl = new URL(this.url)

    this.rpcClient = new rpc.Client({
      host: rpcUrl.hostname,
      port: rpcUrl.port,
      path: rpcUrl.pathname
    })

    this.download = this._download.bind(this)
    this.status = this._status.bind(this)
  }

  _download (links, aria2info) {
    debug('_download', links)

    const promises = links.map(link => new Promise((resolve, reject) => {
      this.rpcClient.call({
        jsonrpc: '2.0',
        method: 'aria2.addUri',
        params: [`token:${this.secret}`, [link]],
        id: this.id++
      }, (err, res) => {
        if (err) {
          console.error('[!] adding download failed', err)
        } else {
          aria2info.push({ gid: res.result, resp: null })
        }
        !err ? resolve(res) : reject(err)
      })
    }))
    return Promise.all(promises)
  }

  _status (aria2info) {
    debug('_status')

    const promises = aria2info.map(info => new Promise((resolve, reject) => {
      this.rpcClient.call({
        jsonrpc: '2.0',
        method: 'aria2.tellStatus',
        params: [`token:${this.secret}`, info.gid, ['status', 'followedBy', 'completedLength', 'totalLength', 'downloadSpeed', 'files']],
        id: this.id++
      }, (err, res) => {
        if (err) {
          console.error('error-querying: ', err) // not printing
        } else {
          info.resp = res
          if (info.resp.result.status !== 'complete') {
            const percentage = res.result.completedLength * 100 / res.result.totalLength
            const speed = res.result.downloadSpeed / (1024 * 1024)
            console.log(`${res.result.files[0].path} downloaded ${percentage.toFixed(2)} % @ ${speed.toFixed(2)} MB/s`)
          }
        }
        !err ? resolve(res) : reject(err)
      })
    }))
    return Promise.all(promises)
  }
}

module.exports = Aria2Downloader

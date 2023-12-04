const fs = require('fs')
const path = require('path')
const parseTorrent = require('parse-torrent')
const debug = require('debug')('patbrid:watchers:debrid-link')
const DebridLinkClient = require('./DebridLinkClient.js')
const DebridLinkTorrent = require('./torrent.js')

class DebridLinkWatcher {
  constructor (apiKey, downloadFn, statusFN) {
    debug('ctor', apiKey)

    this.client = new DebridLinkClient(apiKey)
    this.downloadFn = downloadFn
    this.statusFN = statusFN
    this.watchList = []
  }

  addFile (file) {
    debug('addFile', file)

    const extension = path.extname(file).toLowerCase()

    if (extension === '.magnet') {
      this.addMagnet(file)
    } else {
      this.addTorrent(file)
    }
  }

  addTorrent (file) {
    debug('addTorrent', file)

    const buf = parseTorrent(fs.readFileSync(file))
    const uri = parseTorrent.toMagnetURI({
      infoHash: buf.infoHash
    })
    // Create a torrent instance
    const torrent = new DebridLinkTorrent(this.client, this.downloadFn, this.statusFN, file, uri)

    // Add the torrent to the queue
    return torrent.addToQueue()
    // Save to the watch list
      .then(() => this.addToWatchList(torrent))
    // Log errors
      .catch(err => console.error('[!] addTorrent failed', err))
  }

  addMagnet (file) {
    debug('addMagnet', file)

    //const self = this

    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        console.error('read magnet error', err)
        return
      }
      console.error('[?] magnet link', data)
      // Create a torrent instance
      const torrent = new DebridLinkTorrent(this.client, this.downloadFn, this.statusFN, file, data)

      // Add the torrent to the queue
      return torrent.addToQueue()
      // Save to the watch list
        .then(() => this.addToWatchList(torrent))
      // Log errors
        .catch(err => console.error('[!] addMagnet failed', err))
    })
  }

  checkWatchList () {
    debug('checkWatchList', this.watchList.length)

    // Remove invalid torrents
    this.removeInvalidTorrents()

    // Go through each torrent and update it
    const promises = this.watchList.map(torrent => torrent.update())

    // Wait for all torrents to update
    return Promise.all(promises)
      .catch(err => console.error('[!] checkWatchList failed', err))
  }

  addToWatchList (torrent) {
    debug('addToWatchList', torrent.file)

    // Add the torrent to the watch list
    this.watchList.push(torrent)
  }

  removeFromWatchList (torrent) {
    debug('removeFromWatchList', torrent.file)

    // Remove the torrent from the watch list
    const index = this.watchList.indexOf(torrent)

    if (~index) {
      this.watchList.splice(index, 1)
    }
  }

  removeInvalidTorrents () {
    debug('removeInvalidTorrents')

    // Remove any invalid torrents from the watch list
    this.watchList.forEach(torrent => {
      if (torrent.status === 'invalid') {
        this.removeFromWatchList(torrent)
      }
    })
  }
}

module.exports = DebridLinkWatcher

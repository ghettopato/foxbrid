const debug = require('debug')('patbrid:watchers:debrid-link-api:torrent')
const fs = require('fs')

class DebridLinkTorrent {
  constructor (client, downloadFn, statusFN, file, magnetlink = null) {
    debug('ctor', file)

    this.client = client
    this.downloadFn = downloadFn
    this.statusFn = statusFN
    this.file = file
    this.status = 'pending'
    this.magnetlink = magnetlink
    this.id = null
    this.ariainfo = []
  }

  addToQueue () {
    debug('addToQueue', this.file)
    // Add the torrent file
    if (this.magnetlink != null) {
      return this.client.seedbox.add(this.magnetlink, false, true)
        .then(result => {
        // Set the id and mark as queued
          this.id = result.value.id
          this.status = 'queued'

          console.log(`[+] '${this.file}' added to queue (${this.id})`)

          return this._beginDownload()
        })
        .catch(err => console.error('[!] torrent rejected!', err))
    } else {
      console.log('failed to process file')
    }
  }

  update () {
    debug('update', this.file)
    if (this.status === 'invalid' || this.status === 'delete') {
      return
    }

    if (this.status === 'aria2dl') {
      let done = true
      for (const info of this.ariainfo) {
        if (info.resp == null) {
          done = false
        } else if (info.resp.result.status !== 'complete') {
          done = false
        }
      }
      if (done) {
        this._delete()
      }
      this.statusFn(this.ariainfo)
      return
    }
    // Get the info for the torrent
    return this.client.seedbox.list(this.id)
      .then(info => this._handleUpdate(info))
      .catch(err => {
        debug('update failed', err)

        this.status = 'invalid'

        console.log(`[+] '${this.file}' is invalid`)
      })
  }

  _beginDownload () {
    debug('_beginDownload', this.file)
    this.status = 'downloading'
  }

  _handleUpdate (info) {
    debug('_handleUpdate', this.file)

    console.log(`[+] '${this.file}' id: ${this.id} local: ${this.status} remote: ${info.value[0].status} progress: ${info.value[0].downloadPercent}%`)
    // Has the remote status finished downloading
    if ((info.value[0].status === 100 || info.value[0].status === 6) && (this.status === 'downloading')) {
      // Mark torrent as downloading
      this.status = 'downloaded'
      const urls = info.value[0].files.map(file => file.downloadUrl)
      this.downloadFn(urls, this.ariainfo)
        // Delete the torrent
        .then(this.status = 'aria2dl')
        // Catch any errors
        .catch(err => console.error('[!] _handleUpdate failed', err))
    }
  }

  _delete () {
    debug('_delete', this.file)
    this.status = 'delete'
    // Delete the torrent
    return this.client.seedbox.remove(this.id)
      .then(() => {
        this.status = 'invalid'

        fs.unlinkSync(this.file)

        console.log(`[+] '${this.file}' deleted`)
      })
      .catch(err => console.error('[!] delete failed', err))
  }
}

module.exports = DebridLinkTorrent

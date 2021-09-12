const debug = require('debug')('patbrid:watchers:debrid-link-api:torrent')
const fs = require('fs')

class DebridLinkTorrent {
  constructor (client, downloadFn, file, magnetlink = null) {
    debug('ctor', file)

    this.client = client
    this.downloadFn = downloadFn
    this.file = file
    this.status = 'pending'
    this.magnetlink = magnetlink
    this.id = null
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
  }

  _handleUpdate (info) {
    debug('_handleUpdate', this.file)

    console.log(`[+] '${this.file}' id: ${this.id} local: ${this.status} remote: ${info.value[0].status} progress: ${info.value[0].downloadPercent}%`)
    // Has the remote status finished downloading
    if (info.value[0].status === 100 || info.value[0].status === 6) {
      // Mark torrent as downloaded
      this.status = 'downloaded'
      const urls = info.value[0].files.map(file => file.downloadUrl)
      this.downloadFn(urls)
        // Delete the torrent
        .then(() => this._delete())
        // Catch any errors
        .catch(err => console.error('[!] _handleUpdate failed', err))
    }
  }

  _delete () {
    debug('_delete', this.file)
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

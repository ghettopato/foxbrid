foxbrid
===

A debrid-link (debrid-link.fr) blackhole downloader using aria2 RPC.

### Environment Variables

Value | Description | Default
--- | --- | ---
DEBRID_LINK_API_KEY | Debrid-Link API Key |
ARIA2_URL | Aria2 JSON-RPC URL |
ARIA2_SECRET | Aria2 JSON-RPC Secret |
WATCH_DIR | Directory to watch | /watch
WATCH_RATE | Rate to check for updates | 5000

### Development
forked from https://github.com/mgoodings/patbrid by Miles Goodings

#### Requirements

* An API-Key from debrid-link.fr(https://debrid-link.fr/webapp/apikey)
* Docker
* aria2 with JSON-RPC enabled

#### Setup

Copy `.env.example` to `.env`

#### Run

`$ docker-compose build`

`$ docker-compose run --rm downloader`

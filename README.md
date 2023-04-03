# Getting Started
## Required Stuff
- https://nodejs.org/en/download

That is pretty much it. I have some docker stuff but it broken so just ignore it.

## Setup App
- Open up your terminal
- Navigate to wherever this app is in the terminal
- Run `npm i`

## Run App
- Run `npm start`
- Go to http://localhost:3000

# Want to host?
I didn't set up any thing fancy and I didn't want to pay for the bigger heroku stuff but you can just use that and deploy it there. The buildpacks are as follows:

- heroku/nodejs
- https://github.com/jontewks/puppeteer-heroku-buildpack

Unfortunately puppeteer is memory intensive so you would have to pony up for a bigger server.
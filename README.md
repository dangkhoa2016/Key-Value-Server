
# Replit.com Key-Value Server

A simple Key-Value server made using [Replit.com](https://replit.com) and [Fastify](https://github.com/fastify/fastify).

## Development

Please clone `.env.sample` file and to a new file, change env keys, example file name: `env.local`.
You need to make sure **SECRET** and **ENCRYPTION_KEY** are set to protect your domain url. 
Note: To get `REPLIT_DB_URL`, go to your replit.com url, in the `Shell` tab, type: `echo $REPLIT_DB_URL` and the url will show, copy it and replace with `https://kv.replit.com/v0/zzzzzzzzzzzzz`

Then in terminal
run: `npm run start`
  
## Deploy
Deploy to your own replit.com url by using git.

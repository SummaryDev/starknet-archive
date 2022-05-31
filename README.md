# starknet-archive

Data archiver for StarkNet. 

Build
```bash
npm install && npm run build
```

Start local dev database and run the indexer from the cli
```bash
docker-compose up -d && npm run start
```

Build docker image
```bash
docker build -t starknet-archive .
```
Save docker image
```bash
docker save starknet-archive | gzip > starknet-archive.tgz
```
Run
```bash
docker run --env-file .env --network host -e START_BLOCK=100000 -e FINISH_BLOCK=100003 starknet-archive
```

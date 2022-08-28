# Archiver for StarkNet

## Build
```bash
npm install && npm run build
```

## Develop
 
Start local dev database and run the indexer from the cli
```bash
docker-compose up -d && npm run start
```

Build docker image
```bash
docker build -t starknet-archive .
```

Run docker
```bash
docker run --env-file .env --network host -e STARKNET_ARCHIVE_START_BLOCK=100000 -e STARKNET_ARCHIVE_FINISH_BLOCK=100003 starknet-archive
```

## Deploy

Define env variables
```bash
export namespace=dev
export name=starknet_archive
export typeorm_password=... 
```

Deploy to Kubernetes cluster with helm
```bash
./deploy.sh
```

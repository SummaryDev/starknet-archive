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
Run docker
```bash
docker run --env-file .env --network host -e STARKNET_ARCHIVE_START_BLOCK=100000 -e STARKNET_ARCHIVE_FINISH_BLOCK=100003 starknet-archive
```

Deploy to Kubernetes cluster with helm
```bash
helm upgrade starknet-archive-dev ./helmchart/ --install --namespace dev --set typeorm_password=... --set typeorm_database=dev --set image=729713441316.dkr.ecr.eu-central-1.amazonaws.com/starknet-archive:dev-bf0153e --set name=starknet-archive
```

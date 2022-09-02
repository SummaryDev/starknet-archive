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

Deploy to Kubernetes cluster with helm

```bash
namespace=dev image=729713441316.dkr.ecr.eu-central-1.amazonaws.com/starknet-archive:dev-de25bce db_host=postgres-dev-eu-central-1.cubsklniptgt.eu-central-1.rds.amazonaws.com db_password_archive=archive123 ./deploy.sh 
```

Observe

```shell
kubectl --namespace dev get pods --selector=app=starknet-archive
```

Tail logs

```shell
kubectl --namespace dev logs --follow --selector=app=starknet-archive
```

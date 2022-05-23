# starknet-archive

Data indexer for StarkNet. 

It stores chain blocks in Postgres database in 
decoded and slightly normalized form.

Build
```bash
npm install && npm run build
```

Build docker image with
```bash
docker build -t starknet-archive .
```

Start the database and run the indexer from the cli
```bash
docker-compose -f docker-compose-db.yml up -d && npm run migrate && npm run start
```

Start the indexer and its auxiliary services (gateway and status) then run the indexer from the cli
```bash
docker-compose -f docker-compose-gateway.yml up -d && npm run migrate && npm run start
```

Start all in docker containers
```bash
docker-compose up -d
```

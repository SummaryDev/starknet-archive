# starknet-archive

Data indexer for StarkNet. 

It stores chain blocks in Postgres database in 
decoded and slightly normalized form.

Build with
```bash
docker build -t starknet-archive .
```

Start the database and run the indexer from the cli
```bash
docker-compose up && npm run index
```

Start the indexer and its auxiliary services gateway and status
```bash
docker-compose -f docker-compose-all.yml up
```

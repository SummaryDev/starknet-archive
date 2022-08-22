Install Utilites
```bash
npm install aspd
brew install k9s
```
Add aws credentials
```bash
aspd add
```
Install kubectx, kubens
```bash
https://github.com/ahmetb/kubectx#installation
```

Add Cluster Straknet-Indexer
```bash
aws eks update-kubeconfig --name dev-eks-starknet-indexer --region=eu-central-1 --alias starknet-dev --profile starknet-dev
```

Deploy Helm Chart 
```bash
helm upgrade --install starknet-archive-deployment ./ -f ./values.yaml --create-namespace dev-1
```
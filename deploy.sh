#!/usr/bin/env bash

env | grep 'namespace\|network\|db_host\|image'

#network=goerli envsubst < deploy.yaml | kubectl --namespace $namespace -f - apply
#
#network=mainnet envsubst < deploy.yaml | kubectl --namespace $namespace -f - apply

export network=goerli

cat deploy.yaml | \
sed 's/${namespace}/namespace/g' | sed "s/namespace/$namespace/g" | \
sed 's/${network}/network/g' | sed "s/network/$network/g" | \
sed 's/${starknet_archive_image}/starknet_archive_image/g' | sed "s@starknet_archive_image@${image}@g" |\
sed 's/${db_password_archive}/db_password_archive/g' | sed "s/db_password_archive/$db_password_archive/g" | \
sed 's/${db_host}/db_host/g' | sed "s/db_host/$db_host/g" | \
kubectl --namespace $namespace -f - apply

export network=mainnet

cat deploy.yaml | \
sed 's/${namespace}/namespace/g' | sed "s/namespace/$namespace/g" | \
sed 's/${network}/network/g' | sed "s/network/$network/g" | \
sed 's/${starknet_archive_image}/starknet_archive_image/g' | sed "s@starknet_archive_image@${image}@g" |\
sed 's/${db_password_archive}/db_password_archive/g' | sed "s/db_password_archive/$db_password_archive/g" | \
sed 's/${db_host}/db_host/g' | sed "s/db_host/$db_host/g" | \
kubectl --namespace $namespace -f - apply

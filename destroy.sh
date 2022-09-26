#!/usr/bin/env bash

env | grep 'namespace\|network\|db_host\|image'

function fun() {
#envsubst < deploy.yaml | kubectl --namespace $namespace -f - delete

    cat deploy.yaml | \
    sed 's/${namespace}/namespace/g' | sed "s/namespace/$namespace/g" | \
    sed 's/${network}/network/g' | sed "s/network/$network/g" | \
    sed 's/${image_archive}/image_archive/g' | sed "s@image_archive@${image_archive}@g" |\
    sed 's/${db_password_archive}/db_password_archive/g' | sed "s/db_password_archive/$db_password_archive/g" | \
    sed 's/${db_host}/db_host/g' | sed "s/db_host/$db_host/g" | \
    kubectl --namespace $namespace -f - delete
}

export network=goerli

fun

export network=mainnet

fun


#!/usr/bin/env bash

env | grep 'namespace\|network\|db_host\|image'

function waitfor {
    app=$1

    for i in {1..120}; do
        ready=`(kubectl --namespace=$namespace get pod -l app=$app -o jsonpath={.items[0].status.containerStatuses[0].ready})`
        [[ $ready = true ]] && break || echo "pod $app ready: $ready" && sleep 1
    done

    echo "pod $app ready: $ready"

    if [[ $ready != true ]]
    then
        echo "giving up waiting for $app"
        exit 1
    fi
}

function fun {
    starknet_network=$1

    waitfor pathfinder-${starknet_network}

#    waitfor api-abi-${starknet_network}

    #envsubst < deploy.yaml | kubectl --namespace $namespace -f - apply

    cat deploy.yaml | \
    sed 's/${namespace}/namespace/g' | sed "s/namespace/$namespace/g" | \
    sed 's/${starknet_network}/starknet_network/g' | sed "s/starknet_network/$starknet_network/g" | \
    sed 's/${image_archive}/image_archive/g' | sed "s@image_archive@${image_archive}@g" |\
    sed 's/${db_password_archive}/db_password_archive/g' | sed "s/db_password_archive/$db_password_archive/g" | \
    sed 's/${db_host}/db_host/g' | sed "s/db_host/$db_host/g" | \
    kubectl --namespace $namespace -f - apply

#    --dry-run=client
}

fun goerli

fun mainnet

#fun testnet2


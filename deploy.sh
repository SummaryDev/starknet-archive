#!/usr/bin/env bash

env | grep 'namespace\|network\|db_host\|image_archive'

network=goerli envsubst < deploy.yaml | kubectl --namespace $namespace -f - apply

network=mainnet envsubst < deploy.yaml | kubectl --namespace $namespace -f - apply

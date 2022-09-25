#!/usr/bin/env bash

env | grep 'namespace\|network\|db_host\|image_archive'

envsubst < deploy.yaml | kubectl --namespace $namespace -f - apply --dry-run


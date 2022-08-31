#!/usr/bin/env bash

env | grep 'namespace\|name\|image'

echo helm --namespace $namespace upgrade --install ${name:=starknet-archive}-$namespace ./helmchart/ --set password=${password:=$db_password_archive} --set database=$namespace --set image=$image --set name=${name:=starknet-archive}

kubectl --namespace $namespace get pods --selector=app=$name
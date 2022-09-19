#!/usr/bin/env bash

env | grep 'namespace\|name\|image'

helm --namespace $namespace upgrade --install ${name:=starknet-archive}-$namespace ./helmchart/ --set db_host=${db_host} --set db_password_archive=${db_password_archive} --set database=$namespace --set image=${image:=$image_archive} --set name=${name:=starknet-archive}
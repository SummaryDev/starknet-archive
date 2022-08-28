#!/usr/bin/env bash

env | grep 'namespace\|name\|image'

helm upgrade $name-$namespace ./helmchart/ --install --namespace $namespace --set typeorm_password=$typeorm_password --set typeorm_database=$namespace --set image=$image --set name=$name

kubectl --namespace $namespace get pods --selector=app=$name
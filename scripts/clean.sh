#!/bin/bash

rm_node_modules=$1

echo 'begin'

rm -rf lib

if [[ -n "$rm_node_modules" ]]; then

    echo 'remove node_modules'

    rm -rf node_modules
    rm -rf yarn.lock

    yarn cache clean

    yarn

fi

echo 'done'
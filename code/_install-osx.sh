#!/bin/bash

if ! [[ "$(type -p brew)" ]]
then
    echo "install.sh: OS X: please install Homebrew first." >&2
    exit 1
fi

brew install \
    bzip2 curl bzr git gsasl haproxy libev libevent libffi libxml2 libxslt \
    libyaml openldap openssl ossp-uuid postgresql python2 swig \
    || true

curl https://bootstrap.pypa.io/get-pip.py | sudo /usr/local/bin/python2.7
sudo /usr/local/bin/python2.7 -m pip install -U setuptools virtualenv==15.1.0

/usr/local/bin/python2.7 -m virtualenv .
source ./bin/activate
source ./_postinstall.sh

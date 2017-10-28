# -*- coding: utf-8 -*-

"""
Copyright (C) 2017, Zato Source s.r.o. https://zato.io

Licensed under LGPLv3, see LICENSE.txt for terms and conditions.
"""

from __future__ import absolute_import, division, print_function, unicode_literals

# stdlib
import logging

# gevent
from gevent.lock import RLock

# globre
from globre import compile as globre_compile

# ################################################################################################################################

logger = logging.getLogger(__name__)

# ################################################################################################################################

class Endpoint(object):
    """ A publisher/subscriber in pub/sub workflows.
    """
    def __init__(self, config):
        self.config = config
        self.id = config.id
        self.name = config.name
        self.role = config.role
        self.is_active = config.is_active
        self.is_internal = config.is_internal
        self.hook_service_id = config.hook_service_id

        self.topic_patterns = config.topic_patterns or ''

        self.pub_topic_patterns = []
        self.sub_topic_patterns = []

        self.pub_topics = {}
        self.sub_topics = {}

        self.set_up_patterns()

# ################################################################################################################################

    def set_up_patterns(self):
        data = {
            'topic': self.topic_patterns,
        }

        # is_pub, is_topic -> target set
        targets = {
            (True, True): self.pub_topic_patterns,
            (False, True): self.sub_topic_patterns,
        }

        for key, config in data.iteritems():
            is_topic = key == 'topic'

            for line in config.splitlines():
                line = line.strip()
                if line.startswith('pub=') or line.startswith('sub='):
                    is_pub = line.startswith('pub=')

                    pattern = line[line.find('=')+1:]
                    pattern = globre_compile(pattern)

                    source = (is_pub, is_topic)
                    target = targets[source]
                    target.append(pattern)

                else:
                    logger.warn('Ignoring invalid {} pattern `{}` for `{}` (role:{}) (reason: no pub=/sub= prefix found)'.format(
                        key, line, self.name, self.role))

# ################################################################################################################################

class Topic(object):
    """ An individiual topic ib in pub/sub workflows.
    """
    def __init__(self, config):
        self.config = config
        self.id = config.id
        self.name = config.name
        self.is_active = config.is_active
        self.is_internal = config.is_internal
        self.max_depth = config.max_depth

# ################################################################################################################################

class Subscription(object):
    def __init__(self, config):
        self.config = config
        self.id = config.id
        self.topic_name = config.topic_name

# ################################################################################################################################

class PubSub(object):
    def __init__(self):
        self.subscriptions_by_topic = {}    # Topic name     -> Subscription object
        self.subscriptions_by_sub_key = {}  # Sub key        -> Subscription object

        self.endpoints = {}                 # Endpoint ID    -> Endpoint object
        self.topics = {}                    # Topic ID       -> Topic object

        self.sec_id_to_endpoint_id = {}     # Sec def ID     -> Endpoint ID
        self.ws_chan_id_to_endpoint_id = {} # WS chan def ID -> Endpoint ID
        self.topic_name_to_id = {}          # Topic name     -> Topic ID

        self.lock = RLock()

# ################################################################################################################################

    def get_subscriptions_by_topic(self, topic_name):
        with self.lock:
            return self.subscriptions_by_topic.get(topic_name, [])

# ################################################################################################################################

    def get_subscriptions_by_sub_key(self, sub_key):
        with self.lock:
            return self.subscriptions_by_sub_key.get(sub_key, [])

# ################################################################################################################################

    def has_sub_key(self, sub_key):
        with self.lock:
            return sub_key in self.subscriptions_by_sub_key

# ################################################################################################################################

    def get_endpoint_id_by_sec_id(self, sec_id):
        with self.lock:
            return self.sec_id_to_endpoint_id[sec_id]

# ################################################################################################################################

    def get_endpoint_id_by_chan_id(self, chan_id):
        with self.lock:
            return self.ws_chan_id_to_endpoint_id[chan_id]

# ################################################################################################################################

    def _get_topic_id_by_name(self, topic_name):
        return self.topic_name_to_id[topic_name]

# ################################################################################################################################

    def get_topic_id_by_name(self, topic_name):
        with self.lock:
            return self._get_topic_id_by_name(topic_name)

# ################################################################################################################################

    def get_topic_by_name(self, topic_name):
        with self.lock:
            return self.topics[self._get_topic_id_by_name(topic_name)]

# ################################################################################################################################

    def create_endpoint(self, config):
        with self.lock:
            self.endpoints[config.id] = Endpoint(config)

            if config['security_id']:
                self.sec_id_to_endpoint_id[config['security_id']] = config.id

            if config['ws_channel_id']:
                self.ws_chan_id_to_endpoint_id[config['ws_channel_id']] = config.id

# ################################################################################################################################

    def create_subscription(self, config):
        with self.lock:
            sub = Subscription(config)

            existing_by_topic = self.subscriptions_by_topic.setdefault(config.topic_name, [])
            existing_by_topic.append(sub)

            existing_by_sub_key = self.subscriptions_by_sub_key.setdefault(config.sub_key, [])
            existing_by_sub_key.append(sub)

# ################################################################################################################################

    def _create_topic(self, config):
        self.topics[config.id] = Topic(config)
        self.topic_name_to_id[config.name] = config.id

# ################################################################################################################################

    def create_topic(self, config):
        with self.lock:
            self._create_topic(config)

# ################################################################################################################################

    def _delete_topic(self, topic_id, topic_name):
        del self.topic_name_to_id[topic_name]
        self.subscriptions_by_topic.pop(topic_name, None) # May have no subscriptions hence .pop instead of del
        del self.topics[topic_id]

# ################################################################################################################################

    def delete_topic(self, topic_id):
        with self.lock:
            topic_name = self.topics[topic_id].name
            self._delete_topic(topic_id, topic_name)

# ################################################################################################################################

    def edit_topic(self, del_name, config):
        with self.lock:
            subscriptions_by_topic = self.subscriptions_by_topic.pop(del_name, [])
            self._delete_topic(config.id, del_name)
            self._create_topic(config)
            self.subscriptions_by_topic[config.name] = subscriptions_by_topic

# ################################################################################################################################

    def _is_allowed(self, target, name, security_id, ws_channel_id):

        if security_id:
            source, id = self.sec_id_to_endpoint_id, security_id
        else:
            source, id = self.ws_chan_id_to_endpoint_id, ws_channel_id

        endpoint_id = source[id]
        endpoint = self.endpoints[endpoint_id]

        for elem in getattr(endpoint, target):
            if elem.match(name):
                return True

# ################################################################################################################################

    def is_allowed_pub_topic(self, name, security_id=None, ws_channel_id=None):
        return self._is_allowed('pub_topic_patterns', name, security_id, ws_channel_id)

# ################################################################################################################################

    def is_allowed_sub_topic(self, endpoint_id, name, security_id=None, ws_channel_id=None):
        return self._is_allowed('sub_topic_patterns', name, security_id, ws_channel_id)

# ################################################################################################################################
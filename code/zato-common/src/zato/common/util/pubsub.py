# -*- coding: utf-8 -*-

"""
Copyright (C) 2018, Zato Source s.r.o. https://zato.io

Licensed under LGPLv3, see LICENSE.txt for terms and conditions.
"""

from __future__ import absolute_import, division, print_function, unicode_literals

# ################################################################################################################################

def make_short_msg_copy_from_dict(msg, data_prefix_len, data_prefix_short_len):
    out_msg = {}
    out_msg['msg_id'] = msg['pub_msg_id']
    out_msg['in_reply_to'] = msg.get('in_reply_to')
    out_msg['data'] = msg['data'][:data_prefix_len]
    out_msg['data_prefix_short'] = out_msg['data'][:data_prefix_short_len]
    out_msg['size'] = msg['size']
    out_msg['pub_pattern_matched'] = msg['pub_pattern_matched']
    out_msg['sub_pattern_matched'] = msg['sub_pattern_matched']
    out_msg['pub_time'] = msg['pub_time']
    out_msg['expiration'] = msg['expiration']
    out_msg['expiration_time'] = msg['expiration_time']
    out_msg['topic_id'] = msg['topic_id']
    out_msg['topic_name'] = msg['topic_name']
    out_msg['cluster_id'] = msg['cluster_id']
    out_msg['published_by_id'] = msg['published_by_id']
    out_msg['delivery_status'] = msg['delivery_status']
    out_msg['server_name'] = msg['server_name']
    out_msg['server_pid'] = msg['server_pid']
    out_msg['has_gd'] = msg['has_gd']
    out_msg['recv_time'] = msg['recv_time']
    out_msg['sub_key'] = msg['sub_key']
    return out_msg

# ################################################################################################################################

def make_short_msg_copy_from_msg(msg, data_prefix_len, data_prefix_short_len):
    out_msg = {}
    out_msg['msg_id'] = msg.pub_msg_id
    out_msg['in_reply_to'] = msg.in_reply_to
    out_msg['data'] = msg.data[:data_prefix_len]
    out_msg['data_prefix_short'] = out_msg['data'][:data_prefix_short_len]
    out_msg['size'] = msg.size
    out_msg['pub_pattern_matched'] = msg.pub_pattern_matched
    out_msg['sub_pattern_matched'] = msg.sub_pattern_matched
    out_msg['pub_time'] = msg.pub_time
    out_msg['expiration'] = msg.expiration
    out_msg['expiration_time'] = msg.expiration_time
    out_msg['topic_id'] = msg.topic_id
    out_msg['topic_name'] = msg.topic_name
    out_msg['cluster_id'] = msg.cluster_id
    out_msg['published_by_id'] = msg.published_by_id
    out_msg['delivery_status'] = msg.delivery_status
    out_msg['server_name'] = msg.server_name
    out_msg['server_pid'] = msg.server_pid
    out_msg['has_gd'] = msg.has_gd
    out_msg['recv_time'] = msg.recv_time
    out_msg['sub_key'] = msg.sub_key
    return out_msg

# ################################################################################################################################

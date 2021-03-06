# -*- coding: utf-8 -*-

"""
Copyright (C) 2018, Zato Source s.r.o. https://zato.io

Licensed under LGPLv3, see LICENSE.txt for terms and conditions.
"""

from __future__ import absolute_import, division, print_function, unicode_literals

# stdlib
import errno
import logging
import os
import stat
import tempfile
from cStringIO import StringIO
from datetime import datetime, timedelta
from fcntl import fcntl
from traceback import format_exc
from uuid import uuid4

# gevent
from gevent import sleep

# pyrapidjson
from rapidjson import loads

# Zato
from zato.common import IPC
from zato.common.ipc.forwarder import Forwarder
from zato.common.ipc.publisher import Publisher
from zato.common.ipc.subscriber import Subscriber
from zato.common.util import spawn_greenlet

# ################################################################################################################################

logger = logging.getLogger(__name__)

# ################################################################################################################################

fifo_create_mode = stat.S_IRUSR | stat.S_IWUSR
fifo_ignore_err = errno.EAGAIN, errno.EWOULDBLOCK

# On Linux, this is F_LINUX_SPECIFIC_BASE (1024) + 7
_F_SETPIPE_SZ = 1031

# ################################################################################################################################

class IPCAPI(object):
    """ API through which IPC is performed.
    """
    def __init__(self, is_forwarder, name=None, on_message_callback=None, pid=None):
        self.is_forwarder = is_forwarder
        self.name = name
        self.on_message_callback = on_message_callback
        self.pid = pid

    def run(self):

        if self.is_forwarder:
            spawn_greenlet(Forwarder, self.name, self.pid)
        else:
            self.publisher = Publisher(self.name, self.pid)
            self.subscriber = Subscriber(self.on_message_callback, self.name, self.pid)
            spawn_greenlet(self.subscriber.serve_forever)

    def publish(self, payload):
        self.publisher.publish(payload)

    def _get_response(self, fifo, buffer_size, fifo_ignore_err=fifo_ignore_err, empty=('', None)):

        try:
            buff = StringIO()
            data = object() # Use a sentinel because '' or None are expected from os.read

            # The most common use-case for IPC are publish/subscribe messages and the most
            # common response is this: 'zs;{"r": {"r": null}}'
            # which is 21 bytes. For other messages, the buffer size makes no difference.

            while data not in empty:
                data = os.read(fifo, 21)
                buff.write(data)

            response = buff.getvalue()

            status = response[:IPC.STATUS.LENGTH]
            response = response[IPC.STATUS.LENGTH+1:] # Add 1 to account for the separator
            is_success = status == IPC.STATUS.SUCCESS

            if is_success:
                response = loads(response) if response else ''

            buff.close()

            return is_success, response

        except OSError, e:
            if e.errno not in fifo_ignore_err:
                raise

    def invoke_by_pid(self, service, payload, target_pid, fifo_response_buffer_size, timeout=90, is_async=False):
        """ Invokes a service through IPC, synchronously or in background. If target_pid is an exact PID then this one worker
        process will be invoked if it exists at all.
        """
        # Create a FIFO pipe to receive replies to come through
        fifo_path = os.path.join(tempfile.tempdir, 'zato-ipc-fifo-{}'.format(uuid4().hex))
        os.mkfifo(fifo_path, fifo_create_mode)

        try:
            self.publisher.publish(payload, service, target_pid, reply_to_fifo=fifo_path)

            # Async = we do not need to wait for any response
            if is_async:
                return

            response = None, None

            try:

                # Open the pipe for reading ..
                fifo_fd = os.open(fifo_path, os.O_RDONLY|os.O_NONBLOCK)
                fcntl(fifo_fd, _F_SETPIPE_SZ, 1000000)

                # .. and wait for response ..
                now = datetime.utcnow()
                until = now + timedelta(seconds=timeout)

                while now < until:
                    sleep(0.05)
                    response = self._get_response(fifo_fd, fifo_response_buffer_size)
                    if response:
                        break
                    else:
                        now = datetime.utcnow()

            except Exception:
                logger.warn('Exception in IPC FIFO, e:`%s`', format_exc())

            finally:
                os.close(fifo_fd)

            return response

        except Exception, e:
            logger.warn(format_exc(e))
        finally:
            os.remove(fifo_path)

# ################################################################################################################################

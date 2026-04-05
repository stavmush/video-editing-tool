"""
Global async job queue with a single background worker.

Jobs are submitted as async callables. The worker processes them one at a time,
so multiple sessions can queue jobs without conflicting on CPU/memory.
"""

import asyncio
from typing import Callable, Awaitable

_queue: asyncio.Queue = asyncio.Queue()
_worker_task: asyncio.Task | None = None


async def _worker():
    while True:
        job: Callable[[], Awaitable[None]] = await _queue.get()
        try:
            await job()
        except Exception as e:
            print(f"[queue] job error: {e}")
        finally:
            _queue.task_done()


def start_worker():
    global _worker_task
    _worker_task = asyncio.create_task(_worker())


async def enqueue(job: Callable[[], Awaitable[None]]) -> int:
    """Add a job to the queue. Returns the queue position (1-based)."""
    await _queue.put(job)
    return _queue.qsize()

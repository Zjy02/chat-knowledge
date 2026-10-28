"""A small in-process sliding-window rate limiter.

This is intentionally not a distributed limiter. The MVP runs one API worker;
when scaling horizontally, replace this class with Redis while keeping the
`allow(key, limit, window)` contract.
"""

import asyncio
import time
from collections import defaultdict, deque


class InMemoryRateLimiter:
    """Single-process sliding window limiter.

    The MVP runs one API worker. For multi-worker deployments replace this with
    Redis (INCR + EXPIRE) while keeping the same interface.
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        async with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True

    async def reset(self) -> None:
        async with self._lock:
            self._hits.clear()


rate_limiter = InMemoryRateLimiter()

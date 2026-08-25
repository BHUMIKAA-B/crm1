"""In-memory async MongoDB fallback using mongomock."""
from __future__ import annotations
import mongomock


class AsyncCursorMock:
    def __init__(self, sync_cursor):
        self._cursor = sync_cursor

    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, list):
            self._cursor = self._cursor.sort(key_or_list)
        elif key_or_list:
            self._cursor = self._cursor.sort(key_or_list, direction or 1)
        return self

    def skip(self, skip):
        self._cursor = self._cursor.skip(skip)
        return self

    def limit(self, limit):
        self._cursor = self._cursor.limit(limit)
        return self

    async def to_list(self, length=None):
        items = list(self._cursor)
        if length is not None and length > 0:
            items = items[:length]
        for item in items:
            if isinstance(item, dict) and "_id" in item:
                item["_id"] = str(item["_id"])
        return items

    def __aiter__(self):
        self._iter = iter(self._cursor)
        return self

    async def __anext__(self):
        try:
            val = next(self._iter)
            if isinstance(val, dict) and "_id" in val:
                val["_id"] = str(val["_id"])
            return val
        except StopIteration:
            raise StopAsyncIteration


class AsyncCollectionMock:
    def __init__(self, sync_coll):
        self._coll = sync_coll

    async def find_one(self, filter=None, projection=None):
        doc = self._coll.find_one(filter or {}, projection)
        if doc and isinstance(doc, dict) and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    def find(self, filter=None, projection=None):
        cursor = self._coll.find(filter or {}, projection)
        return AsyncCursorMock(cursor)

    async def insert_one(self, document):
        res = self._coll.insert_one(dict(document))
        return res

    async def insert_many(self, documents):
        res = self._coll.insert_many([dict(d) for d in documents])
        return res

    async def update_one(self, filter, update, upsert=False):
        return self._coll.update_one(filter or {}, update, upsert=upsert)

    async def delete_one(self, filter):
        return self._coll.delete_one(filter or {})

    async def delete_many(self, filter):
        return self._coll.delete_many(filter or {})

    async def update_many(self, filter, update, upsert=False):
        return self._coll.update_many(filter or {}, update, upsert=upsert)

    async def count_documents(self, filter=None):
        return self._coll.count_documents(filter or {})

    def aggregate(self, pipeline):
        cursor = self._coll.aggregate(pipeline)
        return AsyncCursorMock(cursor)


class AsyncDatabaseMock:
    def __init__(self, db_name="visitsarva"):
        self._client = mongomock.MongoClient()
        self._db = self._client[db_name]

    def __getitem__(self, collection_name):
        return AsyncCollectionMock(self._db[collection_name])

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Literal
import re

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

import db
import auth as auth_utils
from models import new_id, now_iso

router = APIRouter(prefix="/api", tags=["blogs"])


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value.lower()).strip()
    return re.sub(r"[-\s]+", "-", value)


def public_filter():
    now = now_iso()
    return {
        "status": "published",
        "$or": [
            {"scheduled_at": None},
            {"scheduled_at": {"$exists": False}},
            {"scheduled_at": {"$lte": now}},
        ],
    }


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""


class ArticleIn(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    slug: str = ""
    excerpt: str = ""
    content: str = Field(default="", min_length=0)
    category: str = ""
    author_name: str = "VisitSarva"
    cover_image: str = ""
    images: list[str] = []
    status: Literal["draft", "published", "scheduled"] = "draft"
    scheduled_at: Optional[str] = None
    is_featured: bool = False
    seo_title: str = ""
    meta_description: str = ""


@router.get("/blog-categories")
async def list_categories():
    return await db.blog_categories().find({}, {"_id": 0}).sort("name", 1).to_list(length=100)


@router.post("/blog-categories")
async def create_category(payload: CategoryIn, _: dict = Depends(auth_utils.require_roles("admin"))):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    if await db.blog_categories().find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        raise HTTPException(status_code=409, detail="Category already exists")
    doc = {"id": new_id(), "name": name, "description": payload.description.strip(), "created_at": now_iso(), "updated_at": now_iso()}
    await db.blog_categories().insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/blog-categories/{category_id}")
async def update_category(category_id: str, payload: CategoryIn, _: dict = Depends(auth_utils.require_roles("admin"))):
    res = await db.blog_categories().update_one({"id": category_id}, {"$set": {"name": payload.name.strip(), "description": payload.description.strip(), "updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@router.delete("/blog-categories/{category_id}")
async def delete_category(category_id: str, _: dict = Depends(auth_utils.require_roles("admin"))):
    res = await db.blog_categories().delete_one({"id": category_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@router.get("/blogs")
async def list_blogs(category: Optional[str] = None, q: Optional[str] = None, featured: Optional[bool] = None, page: int = 1, limit: int = 12):
    query = public_filter()
    if category:
        query["category"] = {"$regex": f"^{re.escape(category)}$", "$options": "i"}
    if q:
        query["$and"] = [{"$or": [{"title": {"$regex": q, "$options": "i"}}, {"excerpt": {"$regex": q, "$options": "i"}}, {"category": {"$regex": q, "$options": "i"}}]}]
    if featured is not None:
        query["is_featured"] = featured
    page = max(1, page)
    limit = min(50, max(1, limit))
    skip = (page - 1) * limit
    cursor = db.blog_articles().find(query, {"_id": 0, "content": 0}).sort([("is_featured", -1), ("published_at", -1), ("created_at", -1)]).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await db.blog_articles().count_documents(query)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/blogs/manage")
async def manage_blogs(_: dict = Depends(auth_utils.require_roles("admin"))):
    return await db.blog_articles().find({}, {"_id": 0}).sort([("updated_at", -1)]).to_list(length=500)


@router.get("/blogs/{slug}")
async def get_blog(slug: str):
    article = await db.blog_articles().find_one({**public_filter(), "slug": slug}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    related = await db.blog_articles().find({**public_filter(), "category": article.get("category"), "slug": {"$ne": slug}}, {"_id": 0, "content": 0}).limit(3).to_list(length=3)
    return {"article": article, "related": related}


@router.post("/blogs")
async def create_blog(payload: ArticleIn, admin: dict = Depends(auth_utils.require_roles("admin"))):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    slug = slugify(payload.slug or payload.title)
    if not slug:
        raise HTTPException(status_code=400, detail="A valid slug is required")
    if await db.blog_articles().find_one({"slug": slug}):
        raise HTTPException(status_code=409, detail="Slug already exists")
    now = now_iso()
    status = payload.status
    scheduled_at = payload.scheduled_at if status == "scheduled" else None
    if status == "scheduled" and not scheduled_at:
        raise HTTPException(status_code=400, detail="Scheduled publication time is required")
    doc = payload.model_dump()
    doc.update({"id": new_id(), "slug": slug, "status": status, "scheduled_at": scheduled_at, "published_at": now if status == "published" else None,
                "reading_time": max(1, len(re.sub(r"<[^>]+>", " ", payload.content).split()) // 200),
                "created_by": admin["id"], "created_at": now, "updated_at": now})
    await db.blog_articles().insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/blogs/{article_id}")
async def update_blog(article_id: str, payload: ArticleIn, _: dict = Depends(auth_utils.require_roles("admin"))):
    existing = await db.blog_articles().find_one({"id": article_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    slug = slugify(payload.slug or payload.title)
    duplicate = await db.blog_articles().find_one({"slug": slug, "id": {"$ne": article_id}})
    if duplicate:
        raise HTTPException(status_code=409, detail="Slug already exists")
    now = now_iso()
    status = payload.status
    updates = payload.model_dump()
    updates.update({"slug": slug, "status": status, "scheduled_at": payload.scheduled_at if status == "scheduled" else None,
                    "published_at": existing.get("published_at") if status != "draft" else None,
                    "reading_time": max(1, len(re.sub(r"<[^>]+>", " ", payload.content).split()) // 200),
                    "updated_at": now})
    if status == "published" and not existing.get("published_at"):
        updates["published_at"] = now
    await db.blog_articles().update_one({"id": article_id}, {"$set": updates})
    return await db.blog_articles().find_one({"id": article_id}, {"_id": 0})


@router.delete("/blogs/{article_id}")
async def delete_blog(article_id: str, _: dict = Depends(auth_utils.require_roles("admin"))):
    res = await db.blog_articles().delete_one({"id": article_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"ok": True}


@router.post("/blog-images")
async def upload_blog_image(file: UploadFile = File(...), _: dict = Depends(auth_utils.require_roles("admin"))):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")
    contents = await file.read()
    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Maximum image size is 8 MB")
    fs = AsyncIOMotorGridFSBucket(db.get_db())
    grid_id = await fs.upload_from_stream(file.filename or "blog-image", contents, metadata={"content_type": file.content_type})
    return {"url": f"/api/blog-images/{str(grid_id)}"}


@router.get("/blog-images/{file_id}")
async def blog_image(file_id: str):
    from bson import ObjectId
    from bson.errors import InvalidId
    try:
        oid = ObjectId(file_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Image not found")
    fs = AsyncIOMotorGridFSBucket(db.get_db())
    try:
        stream = await fs.open_download_stream(oid)
    except Exception:
        raise HTTPException(status_code=404, detail="Image not found")
    grid_out = await fs.find({"_id": oid}).to_list(length=1)
    content_type = "application/octet-stream"
    if grid_out and grid_out[0].metadata:
        content_type = grid_out[0].metadata.get("content_type", content_type)
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return Response(content=b"".join(chunks), media_type=content_type)

"""Pydantic schemas / DB models for VisitSarva."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import uuid


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- User ----------
UserRole = Literal["buyer", "seller", "admin"]


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)
    role: UserRole = "buyer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    is_active: bool = True
    saved_properties: List[str] = []
    created_at: str

    model_config = ConfigDict(extra="ignore")


# ---------- Property ----------
PropertyCategory = Literal[
    "commercial",
    "residential",
    "plot",
    "agriculture",
    "apartment",
    "rental",
    "industrial",
    "construction_interior",
]
PropertyStatus = Literal[
    "pending_verification",
    "verified",
    "published",
    "rejected",
    "changes_requested",
    "sold",
    "rented",
]


class Location(BaseModel):
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None


class Area(BaseModel):
    size: float = 0
    unit: Literal["sqft", "sqm", "acre", "cent", "guntha"] = "sqft"


class PropertyImage(BaseModel):
    url: str
    public_id: Optional[str] = None


class PropertyCreate(BaseModel):
    title: str
    description: str = ""
    category: PropertyCategory
    sub_category: Optional[str] = None
    price: float
    price_negotiable: bool = False
    location: Location
    area: Area
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    floors: Optional[int] = None
    facing: Optional[str] = None
    furnishing: Optional[str] = None
    amenities: List[str] = []
    features: List[str] = []
    images: List[PropertyImage] = []
    documents: List[PropertyImage] = []
    is_featured: bool = False


class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[PropertyCategory] = None
    sub_category: Optional[str] = None
    price: Optional[float] = None
    price_negotiable: Optional[bool] = None
    location: Optional[Location] = None
    area: Optional[Area] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    floors: Optional[int] = None
    facing: Optional[str] = None
    furnishing: Optional[str] = None
    amenities: Optional[List[str]] = None
    features: Optional[List[str]] = None
    images: Optional[List[PropertyImage]] = None


# ---------- Enquiry ----------
class EnquiryCreate(BaseModel):
    property_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: str
    message: str = ""
    contact_preference: Literal["call", "email", "whatsapp"] = "call"


# ---------- Service Request ----------
ServiceType = Literal[
    "pre_registration",
    "khata_assistance",
    "property_valuation",
    "land_approval",
    "plan_approval",
    "property_conversion",
    "government_approval",
]


class ServiceRequestCreate(BaseModel):
    request_type: ServiceType
    address: str = ""
    description: str = ""
    name: str
    email: EmailStr
    phone: str


# ---------- Admin verification ----------
class VerifyDecision(BaseModel):
    notes: Optional[str] = ""


class RejectDecision(BaseModel):
    reason: str


# ---------- AI ----------
class ChatMsg(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ListingAssistantRequest(BaseModel):
    session_id: str
    message: str
    history: List[ChatMsg] = []


class ListingAssistantResponse(BaseModel):
    reply: str
    extracted: dict = {}


class SmartSearchRequest(BaseModel):
    query: str


class SmartSearchResponse(BaseModel):
    summary: str
    filters: dict = {}
    results: List[dict] = []
    count: int = 0

from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Optional, Literal, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import uuid

# Re-use helpers from models.py or define here to avoid circular imports if needed
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

# ---------- Employee ----------
EmployeeRole = Literal["trainee", "executive", "team_lead", "bdo", "dpo", "founder", "admin"]
AccountStatus = Literal["active", "suspended", "exited"]

class Employee(BaseModel):
    id: str = Field(default_factory=new_id)
    employee_id: str
    name: str
    email: EmailStr
    phone: str
    role: EmployeeRole
    department: str = ""
    team_id: Optional[str] = None
    joining_date: str = Field(default_factory=now_iso)
    reporting_manager: Optional[str] = None  # ID of the manager
    status: AccountStatus = "active"
    last_login: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)
    role: EmployeeRole
    department: str = ""
    team_id: Optional[str] = None
    reporting_manager: Optional[str] = None

class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str

# ---------- Team ----------
class Team(BaseModel):
    id: str = Field(default_factory=new_id)
    team_id: str
    name: str
    team_leader_id: str
    status: Literal["active", "inactive"] = "active"
    created_by: str
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class TeamCreate(BaseModel):
    name: str
    team_leader_id: str


# ---------- Customer ----------
class Customer(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: str = ""
    created_by: str  # Employee ID
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    notes: str = ""
    type: Literal["lead", "buyer", "seller", "investor", "referral"] = "lead"

class CustomerCreate(BaseModel):
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: str = ""
    notes: str = ""

# ---------- Requirement ----------
class Requirement(BaseModel):
    id: str = Field(default_factory=new_id)
    customer_id: str
    type: Literal["buy", "sell", "rent", "lease"]
    property_type: str
    preferred_location: List[str] = []
    budget_min: float = 0
    budget_max: float = 0
    size_min: float = 0
    size_max: float = 0
    purpose: str = ""
    timeline: str = ""
    preferred_facing: List[str] = []
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class RequirementCreate(BaseModel):
    customer_id: str
    type: Literal["buy", "sell", "rent", "lease"]
    property_type: str
    preferred_location: List[str] = []
    budget_min: float = 0
    budget_max: float = 0
    size_min: float = 0
    size_max: float = 0
    purpose: str = ""
    timeline: str = ""
    preferred_facing: List[str] = []
    notes: str = ""

# ---------- Lead ----------
LeadStatus = Literal[
    "new", "contacted", "qualified", "requirement_captured", 
    "property_shared", "site_visit_planned", "site_visit_completed",
    "negotiation", "token", "agreement", "registration", 
    "closed_won", "closed_lost", "follow_up_later"
]

class Lead(BaseModel):
    id: str = Field(default_factory=new_id)
    lead_id: str
    customer_id: str
    source: str
    status: LeadStatus = "new"
    assigned_to: str  # Employee ID
    created_by: str  # Employee ID
    registered_date: str = Field(default_factory=now_iso)
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    notes: str = ""

class LeadCreate(BaseModel):
    customer_id: Optional[str] = None
    customer: Optional[CustomerCreate] = None
    requirement: Optional[RequirementCreate] = None
    source: str
    assigned_to: Optional[str] = None
    registered_date: Optional[str] = None
    notes: str = ""

class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

# ---------- Timeline / Audit Log ----------
class TimelineEvent(BaseModel):
    id: str = Field(default_factory=new_id)
    entity_type: str # lead, property, deal
    entity_id: str
    action: str
    description: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    performed_by: str # Employee ID
    timestamp: str = Field(default_factory=now_iso)

class AuditLog(BaseModel):
    id: str = Field(default_factory=new_id)
    who: str # Employee ID
    action: str
    entity: str
    entity_id: str
    field: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    timestamp: str = Field(default_factory=now_iso)

# ---------- Follow-up & Task ----------
TaskPriority = Literal["low", "medium", "high", "urgent"]
TaskStatus = Literal["pending", "in_progress", "completed", "cancelled"]

class Task(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: str = ""
    due_date: str
    due_time: Optional[str] = None
    priority: TaskPriority = "medium"
    status: TaskStatus = "pending"
    assigned_to: str # Employee ID
    related_entity_type: Optional[str] = None # lead, customer, property, deal
    related_entity_id: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    due_date: str
    due_time: Optional[str] = None
    priority: TaskPriority = "medium"
    assigned_to: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None

class Followup(Task):
    type: Literal["followup"] = "followup"
    followup_reason: str = ""

class FollowupCreate(TaskCreate):
    followup_reason: str = ""


# ---------- Property & Inventory (CRM Extension) ----------
class PropertyOwner(BaseModel):
    id: str = Field(default_factory=new_id)
    owner_id: str # VS-OWN-000001
    name: str
    mobile: str
    email: Optional[EmailStr] = None
    address: str = ""
    properties_owned: List[str] = [] # List of Property IDs
    assigned_employee: Optional[str] = None # Employee ID
    team_id: Optional[str] = None # Team ID
    source: Literal["manual_crm", "public_website"] = "manual_crm"
    created_by: Optional[str] = None # Employee ID
    status: Literal["active", "inactive"] = "active"
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class Broker(BaseModel):
    id: str = Field(default_factory=new_id)
    broker_id: str # VS-BROK-000001
    name: str
    phone: str
    company: str = ""
    area: str = ""
    specialization: str = ""
    reliability: int = 3 # 1-5
    assigned_employee: Optional[str] = None # Employee ID
    created_by: Optional[str] = None # Employee ID
    status: Literal["active", "inactive"] = "active"
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class CommissionEnroll(BaseModel):
    executive_id: str
    deal_id: str
    amount: float
    percentage: float = 0.0
    notes: str = ""

class CommissionRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    commission_id: str # VS-COMM-000001
    executive_id: str
    team_id: str
    deal_id: str
    property_id: Optional[str] = None
    amount: float
    percentage: float = 0.0
    status: Literal["enrolled", "approved", "disbursed", "cancelled"] = "enrolled"
    notes: str = ""
    enrolled_by: str # Employee ID of Team Leader / Founder
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class SiteVisitFeedback(BaseModel):
    interested: bool
    rating: int # 1-5
    price_feedback: str = ""
    location_feedback: str = ""
    document_concerns: str = ""
    reason_for_rejection: str = ""
    next_action: str = ""

SiteVisitStatus = Literal["scheduled", "completed", "cancelled", "rescheduled"]

class SiteVisit(BaseModel):
    id: str = Field(default_factory=new_id)
    customer_id: str
    employee_id: str
    date: str
    time: str
    properties: List[str] = [] # List of Property IDs
    status: SiteVisitStatus = "scheduled"
    notes: str = ""
    feedback: Optional[SiteVisitFeedback] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

# ---------- Deals & Transactions (CRM Extension) ----------
DealStatus = Literal["negotiation", "token_received", "agreement_done", "registration_done", "closed", "cancelled"]

class Deal(BaseModel):
    id: str = Field(default_factory=new_id)
    deal_id: str # VS-DEAL-000001
    customer_id: str
    property_id: str
    assigned_employee: str # Employee ID
    status: DealStatus = "negotiation"
    
    # Financial fields (RESTRICTED ACCESS)
    final_deal_value: float = 0
    token_amount: float = 0
    agreement_amount: float = 0
    expected_commission: float = 0
    actual_commission: float = 0
    employee_commission_share: float = 0
    broker_commission_share: float = 0
    
    registration_date: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class DealCreate(BaseModel):
    customer_id: str
    property_id: str
    final_deal_value: float
    expected_commission: float = 0

class Negotiation(BaseModel):
    id: str = Field(default_factory=new_id)
    deal_id: str
    seller_asking_price: float
    buyer_offer: float
    counter_offer: Optional[float] = None
    current_expected_price: float
    notes: str = ""
    next_action: str = ""
    created_at: str = Field(default_factory=now_iso)

# ---------- Property Sharing ----------
class PropertyShare(BaseModel):
    id: str = Field(default_factory=new_id)
    customer_id: str
    employee_id: str
    properties: List[str] = [] # Property IDs
    date_shared: str = Field(default_factory=now_iso)
    customer_response: str = "pending" # interested, rejected, pending
    notes: str = ""

# ---------- Documents ----------
DocType = Literal[
    "sale_deed", "mother_deed", "encumbrance_certificate", "khata", 
    "tax_receipt", "conversion_doc", "approval_doc", "rtc", 
    "layout_plan", "survey_doc", "legal_opinion", "agreement", 
    "registration_doc", "other"
]

class CrmDocument(BaseModel):
    id: str = Field(default_factory=new_id)
    entity_type: str # property, customer, deal
    entity_id: str
    doc_type: DocType
    type_of_document_service: Optional[str] = None
    file_name: str
    file_url: str
    uploaded_by: str # Employee ID
    verification_status: Literal["pending", "verified", "rejected"] = "pending"
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    notes: str = ""
    uploaded_at: str = Field(default_factory=now_iso)

# ---------- Payments ----------
PaymentType = Literal["token", "agreement", "registration", "commission", "other"]
PaymentStatus = Literal["pending", "partial", "paid", "overdue"]

class Payment(BaseModel):
    id: str = Field(default_factory=new_id)
    deal_id: str
    payment_type: PaymentType
    amount: float
    due_date: str
    received_date: Optional[str] = None
    status: PaymentStatus = "pending"
    reference_no: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)

# ---------- Notifications ----------
class Notification(BaseModel):
    id: str = Field(default_factory=new_id)
    recipient_id: str # Employee ID
    title: str
    message: str
    type: str = "info" # info, warning, lead, site_visit, deal, task
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    is_read: bool = False
    created_at: str = Field(default_factory=now_iso)


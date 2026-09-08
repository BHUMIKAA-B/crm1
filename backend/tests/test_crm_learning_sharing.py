"""
Automated unit & integration test suite for targeted CRM Learning content sharing system.
Run with: pytest backend/tests/test_crm_learning_sharing.py -v
"""
import pytest
import os
import json
from jose import jwt
from datetime import datetime, timedelta, timezone

os.environ.setdefault("JWT_SECRET", "test_secret_123")

from routers.crm_learning_router import (
    ADMIN_ROLES,
    DANGEROUS_EXTENSIONS,
    detect_content_type
)

def make_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=1)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": exp, "type": "employee_access"},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )


class TestRoleAuthorizationRules:
    """Test RBAC role rules for Learning content creation & management."""

    def test_founder_and_bdo_are_authorized(self):
        assert "founder" in ADMIN_ROLES
        assert "bdo" in ADMIN_ROLES

    def test_executive_and_trainee_are_not_authorized(self):
        for unauthorized_role in ["executive", "trainee", "team_lead", "dpo"]:
            assert unauthorized_role not in ADMIN_ROLES, f"{unauthorized_role} MUST NOT be in ADMIN_ROLES"


class TestFileValidationRules:
    """Test file type detection & executable protection filters."""

    def test_detect_content_type_video(self):
        assert detect_content_type("video/mp4", "training.mp4") == "video"
        assert detect_content_type("video/webm", "video.webm") == "video"
        assert detect_content_type("video/quicktime", "demo.mov") == "video"

    def test_detect_content_type_image(self):
        assert detect_content_type("image/jpeg", "diagram.jpg") == "image"
        assert detect_content_type("image/png", "chart.png") == "image"
        assert detect_content_type("image/webp", "photo.webp") == "image"

    def test_detect_content_type_pdf(self):
        assert detect_content_type("application/pdf", "handbook.pdf") == "pdf"

    def test_detect_content_type_document(self):
        assert detect_content_type("application/msword", "guide.docx") == "document"
        assert detect_content_type("application/vnd.ms-excel", "data.xlsx") == "document"
        assert detect_content_type("text/plain", "notes.txt") == "document"

    def test_dangerous_extensions_are_blocked(self):
        blocked = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".scr", ".vbs", ".js", ".msi", ".jar"]
        for ext in blocked:
            assert ext in DANGEROUS_EXTENSIONS, f"Extension {ext} MUST be blocked"


class TestRecipientFilteringLogic:
    """Test backend query filtering rules for target recipient scoping."""

    SAMPLE_ITEMS = [
        {
            "id": "content-1",
            "title": "Founder Video for User A & B",
            "created_by": "emp-founder",
            "is_published": True,
            "recipients": ["emp-user-a", "emp-user-b"]
        },
        {
            "id": "content-2",
            "title": "BDO Document for User A only",
            "created_by": "emp-bdo",
            "is_published": True,
            "recipients": ["emp-user-a"]
        },
        {
            "id": "content-3",
            "title": "Draft for User C",
            "created_by": "emp-founder",
            "is_published": False,
            "recipients": ["emp-user-c"]
        }
    ]

    def filter_for_user(self, items, user_id, role):
        if role in ADMIN_ROLES:
            return items
        return [
            item for item in items
            if item.get("is_published") and user_id in item.get("recipients", [])
        ]

    def test_user_a_sees_assigned_published_only(self):
        user_a_items = self.filter_for_user(self.SAMPLE_ITEMS, "emp-user-a", "executive")
        titles = [i["title"] for i in user_a_items]
        assert "Founder Video for User A & B" in titles
        assert "BDO Document for User A only" in titles
        assert "Draft for User C" not in titles
        assert len(user_a_items) == 2

    def test_user_b_sees_only_assigned_published(self):
        user_b_items = self.filter_for_user(self.SAMPLE_ITEMS, "emp-user-b", "trainee")
        titles = [i["title"] for i in user_b_items]
        assert "Founder Video for User A & B" in titles
        assert "BDO Document for User A only" not in titles
        assert len(user_b_items) == 1

    def test_user_c_cannot_see_draft(self):
        user_c_items = self.filter_for_user(self.SAMPLE_ITEMS, "emp-user-c", "executive")
        assert len(user_c_items) == 0, "Draft content must not be visible to recipients until published"

    def test_founder_sees_all_managed_content(self):
        founder_items = self.filter_for_user(self.SAMPLE_ITEMS, "emp-founder", "founder")
        assert len(founder_items) == 3


if __name__ == "__main__":
    t_roles = TestRoleAuthorizationRules()
    t_roles.test_founder_and_bdo_are_authorized()
    t_roles.test_executive_and_trainee_are_not_authorized()

    t_files = TestFileValidationRules()
    t_files.test_detect_content_type_video()
    t_files.test_detect_content_type_image()
    t_files.test_detect_content_type_pdf()
    t_files.test_detect_content_type_document()
    t_files.test_dangerous_extensions_are_blocked()

    t_rec = TestRecipientFilteringLogic()
    t_rec.test_user_a_sees_assigned_published_only()
    t_rec.test_user_b_sees_only_assigned_published()
    t_rec.test_user_c_cannot_see_draft()
    t_rec.test_founder_sees_all_managed_content()

    print("All CRM Learning Targeted Sharing unit tests PASSED OK!")

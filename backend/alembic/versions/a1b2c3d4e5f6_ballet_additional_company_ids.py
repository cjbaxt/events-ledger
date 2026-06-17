"""add additional_company_ids to event_ballet

Revision ID: a1b2c3d4e5f6
Revises: f2b3c4d5e6f7
Create Date: 2026-06-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

revision = "a1b2c3d4e5f6"
down_revision = "f2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "event_ballet",
        sa.Column("additional_company_ids", ARRAY(UUID(as_uuid=True)), nullable=True),
    )


def downgrade():
    op.drop_column("event_ballet", "additional_company_ids")

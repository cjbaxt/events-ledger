"""add payment_method table and event FK

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payment_method",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("total_cost", sa.Numeric(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="EUR"),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
    )
    op.add_column(
        "event",
        sa.Column("payment_method_id", UUID(as_uuid=True), sa.ForeignKey("payment_method.id"), nullable=True),
    )


def downgrade():
    op.drop_column("event", "payment_method_id")
    op.drop_table("payment_method")

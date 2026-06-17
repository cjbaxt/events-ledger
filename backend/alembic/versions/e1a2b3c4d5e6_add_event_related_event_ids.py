"""add event.related_event_ids

Revision ID: e1a2b3c4d5e6
Revises: c5f07f57cce4
Create Date: 2026-06-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'e1a2b3c4d5e6'
down_revision = 'c5f07f57cce4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('event', sa.Column('related_event_ids', sa.ARRAY(sa.UUID()), nullable=True))


def downgrade() -> None:
    op.drop_column('event', 'related_event_ids')

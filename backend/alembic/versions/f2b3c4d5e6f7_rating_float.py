"""change event.rating to float for half-star support

Revision ID: f2b3c4d5e6f7
Revises: e1a2b3c4d5e6
Create Date: 2026-06-17
"""
from alembic import op

revision = 'f2b3c4d5e6f7'
down_revision = 'e1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE event ALTER COLUMN rating TYPE FLOAT USING rating::FLOAT")


def downgrade() -> None:
    op.execute("ALTER TABLE event ALTER COLUMN rating TYPE INTEGER USING ROUND(rating)::INTEGER")

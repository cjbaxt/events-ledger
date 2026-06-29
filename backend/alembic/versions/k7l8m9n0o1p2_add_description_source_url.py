"""Add description_source_url to event table

Revision ID: k7l8m9n0o1p2
Revises: j6k7l8m9n0o1
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'k7l8m9n0o1p2'
down_revision = 'j6k7l8m9n0o1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('event', sa.Column('description_source_url', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('event', 'description_source_url')

"""Add full_description and ai_summary to event table

Revision ID: j6k7l8m9n0o1
Revises: i5j6k7l8m9n0
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'j6k7l8m9n0o1'
down_revision = 'i5j6k7l8m9n0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('event', sa.Column('full_description', sa.Text(), nullable=True))
    op.add_column('event', sa.Column('ai_summary', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('event', 'ai_summary')
    op.drop_column('event', 'full_description')

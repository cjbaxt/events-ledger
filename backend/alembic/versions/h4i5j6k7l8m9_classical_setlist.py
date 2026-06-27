"""Add setlist fields to event_classical

Revision ID: h4i5j6k7l8m9
Revises: g3h4i5j6k7l8
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'h4i5j6k7l8m9'
down_revision = 'g3h4i5j6k7l8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('event_classical', sa.Column('setlist_fm_url', sa.String(), nullable=True))
    op.add_column('event_classical', sa.Column('setlist', postgresql.JSON(), nullable=True))


def downgrade():
    op.drop_column('event_classical', 'setlist')
    op.drop_column('event_classical', 'setlist_fm_url')

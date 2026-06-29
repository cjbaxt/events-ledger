"""Drop status column from event table

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'i5j6k7l8m9n0'
down_revision = 'h4i5j6k7l8m9'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('event', 'status')


def downgrade():
    op.add_column('event', sa.Column('status', sa.String(), nullable=False, server_default='attended'))

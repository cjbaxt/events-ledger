"""Add status column to event table

Revision ID: a3f1c8e20b44
Revises: 2dc842b37f3f
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'a3f1c8e20b44'
down_revision = '2dc842b37f3f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'event',
        sa.Column('status', sa.String(), nullable=False, server_default='attended'),
    )


def downgrade() -> None:
    op.drop_column('event', 'status')

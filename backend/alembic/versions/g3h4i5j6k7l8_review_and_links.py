"""Add review and links fields, migrate substack_url

Revision ID: g3h4i5j6k7l8
Revises: f2b3c4d5e6f7
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'g3h4i5j6k7l8'
down_revision = 'd3e4f5a6b7c8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('event', sa.Column('review', sa.Text(), nullable=True))
    op.add_column('event', sa.Column('links', JSONB(), nullable=True))
    op.execute("""
        UPDATE event
        SET links = jsonb_build_array(
            jsonb_build_object('url', substack_url, 'label', 'Substack')
        )
        WHERE substack_url IS NOT NULL
    """)
    op.drop_column('event', 'substack_url')


def downgrade() -> None:
    op.add_column('event', sa.Column('substack_url', sa.Text(), nullable=True))
    op.execute("""
        UPDATE event
        SET substack_url = (links->0->>'url')
        WHERE links IS NOT NULL AND jsonb_array_length(links) > 0
    """)
    op.drop_column('event', 'links')
    op.drop_column('event', 'review')

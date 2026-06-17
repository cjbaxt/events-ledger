"""add event_credit table

Revision ID: d3e4f5a6b7c8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'd3e4f5a6b7c8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'event_credit',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('event.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('person_id', UUID(as_uuid=True), sa.ForeignKey('person.id'), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
    )

    # Migrate existing conductor_id / director_id from event_opera into event_credit
    op.execute("""
        INSERT INTO event_credit (id, event_id, role, person_id, sort_order)
        SELECT gen_random_uuid(), event_id, 'Conductor', conductor_id, 0
        FROM event_opera
        WHERE conductor_id IS NOT NULL
    """)
    op.execute("""
        INSERT INTO event_credit (id, event_id, role, person_id, sort_order)
        SELECT gen_random_uuid(), event_id, 'Stage Director', director_id, 0
        FROM event_opera
        WHERE director_id IS NOT NULL
    """)
    # Migrate ballet conductor
    op.execute("""
        INSERT INTO event_credit (id, event_id, role, person_id, sort_order)
        SELECT gen_random_uuid(), event_id, 'Conductor', conductor_id, 0
        FROM event_ballet
        WHERE conductor_id IS NOT NULL
    """)


def downgrade():
    op.drop_table('event_credit')

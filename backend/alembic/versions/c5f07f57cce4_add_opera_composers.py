"""add_opera_composers

Revision ID: c5f07f57cce4
Revises: a3f1c8e20b44
Create Date: 2026-06-17 15:13:53.295742

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c5f07f57cce4'
down_revision: Union[str, Sequence[str], None] = 'a3f1c8e20b44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('event_opera', sa.Column('composers', sa.ARRAY(sa.UUID()), nullable=True))


def downgrade() -> None:
    op.drop_column('event_opera', 'composers')

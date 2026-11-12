"""rate limit events

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa
import app.core.database


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('rate_limit_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('key', sa.String(length=64), nullable=False),
    sa.Column('created_at', app.core.database.UTCDateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('rate_limit_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_rate_limit_events_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_rate_limit_events_key'), ['key'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('rate_limit_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_rate_limit_events_key'))
        batch_op.drop_index(batch_op.f('ix_rate_limit_events_created_at'))

    op.drop_table('rate_limit_events')

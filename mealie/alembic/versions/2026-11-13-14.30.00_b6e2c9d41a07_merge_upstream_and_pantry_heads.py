"""merge upstream and pantry heads

Revision ID: b6e2c9d41a07
Revises: f3a1ae61d772, f7677d17b953
Create Date: 2026-11-13 14:30:00.000000

"""

# revision identifiers, used by Alembic.
revision = "b6e2c9d41a07"
down_revision: str | tuple[str, ...] | None = ("f3a1ae61d772", "f7677d17b953")
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade():
    pass


def downgrade():
    pass

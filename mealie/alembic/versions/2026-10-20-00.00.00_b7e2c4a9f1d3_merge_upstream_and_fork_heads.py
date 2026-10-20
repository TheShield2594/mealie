"""merge upstream and fork migration heads

Revision ID: b7e2c4a9f1d3
Revises: a91720b8a7e7, dca4a6fd2469
Create Date: 2026-10-20 00:00:00.000000

"""

# revision identifiers, used by Alembic.
revision = "b7e2c4a9f1d3"
down_revision: str | tuple[str, ...] | None = ("a91720b8a7e7", "dca4a6fd2469")
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade():
    pass


def downgrade():
    pass

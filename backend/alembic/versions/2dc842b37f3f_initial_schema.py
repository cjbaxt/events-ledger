"""initial schema

Revision ID: 2dc842b37f3f
Revises:
Create Date: 2026-06-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2dc842b37f3f"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Independent tables ---

    op.create_table(
        "venue_operator",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("website_url", sa.String(), nullable=True),
        sa.Column("wikipedia_url", sa.String(), nullable=True),
    )

    op.create_table(
        "person",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("roles", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("website_url", sa.String(), nullable=True),
        sa.Column("musicbrainz_url", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "ensemble",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=True),
        sa.Column("website_url", sa.String(), nullable=True),
        sa.Column("musicbrainz_url", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "festival",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("edition", sa.String(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("website_url", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "venue",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("venue.id"), nullable=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("venue_operator.id"), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("venue_type", sa.String(), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("website_url", sa.String(), nullable=True),
        sa.Column("maps_url", sa.String(), nullable=True),
    )

    op.create_table(
        "work",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("musicbrainz_url", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "musical_piece",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("movement", sa.String(), nullable=True),
        sa.Column("composer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("composer_text", sa.String(), nullable=True),
        sa.Column("arranger_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("original_work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("musical_piece.id"), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("catalogue_number", sa.String(), nullable=True),
        sa.Column("musicbrainz_url", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "production",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("director_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("start_date", sa.String(), nullable=True),
        sa.Column("end_date", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("time", sa.Time(), nullable=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("venue.id"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
        sa.Column("price_paid", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("festival_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("festival.id"), nullable=True),
        sa.Column("substack_url", sa.String(), nullable=True),
        sa.Column("data_completeness", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # --- Extension tables ---

    op.create_table(
        "event_music",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("headliner_person_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("headliner_ensemble_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("support_act_person_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("support_act_ensemble_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("tour_name", sa.String(), nullable=True),
        sa.Column("setlist", postgresql.JSON(), nullable=True),
        sa.Column("setlist_fm_url", sa.String(), nullable=True),
    )

    op.create_table(
        "event_classical",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("ensemble_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("conductor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("notes_on_performance", sa.Text(), nullable=True),
    )

    op.create_table(
        "classical_programme_item",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), nullable=False),
        sa.Column("musical_piece_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("musical_piece.id"), nullable=False),
        sa.Column("soloists", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("order", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "event_opera",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
        sa.Column("production_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production.id"), nullable=True),
        sa.Column("conductor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("director_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("cast", postgresql.JSON(), nullable=True),
        sa.Column("ensemble_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("libretto_language", sa.String(), nullable=True),
        sa.Column("surtitles_languages", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("operabase_url", sa.String(), nullable=True),
    )

    op.create_table(
        "event_ballet",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
        sa.Column("production_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production.id"), nullable=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("orchestra_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("conductor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("cast", postgresql.JSON(), nullable=True),
    )

    op.create_table(
        "ballet_programme_item",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), nullable=False),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=False),
        sa.Column("choreographer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("soloists", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("order", sa.Integer(), nullable=True),
    )

    op.create_table(
        "ballet_programme_music",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("programme_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ballet_programme_item.id"), nullable=False),
        sa.Column("musical_piece_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("musical_piece.id"), nullable=False),
        sa.Column("order", sa.Integer(), nullable=True),
    )

    op.create_table(
        "event_dance",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("choreographer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
        sa.Column("programme", postgresql.JSON(), nullable=True),
        sa.Column("music_notes", sa.String(), nullable=True),
    )

    op.create_table(
        "event_circus",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("director_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
    )

    op.create_table(
        "event_theatre",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
        sa.Column("production_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production.id"), nullable=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("director_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("cast", postgresql.JSON(), nullable=True),
        sa.Column("playwright_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
    )

    op.create_table(
        "event_cabaret",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("headliner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("host_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("supporting_cast", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("ensemble_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("tour_name", sa.String(), nullable=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
    )

    op.create_table(
        "event_comedy",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("performer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("support_acts", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("ensemble_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("tour_name", sa.String(), nullable=True),
    )

    op.create_table(
        "event_spoken_word",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("performers", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("works_read", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("host_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
    )

    op.create_table(
        "event_talk",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("speaker_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("host_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("topic", sa.String(), nullable=True),
        sa.Column("host_organisation", sa.String(), nullable=True),
        sa.Column("recording_url", sa.String(), nullable=True),
    )

    op.create_table(
        "event_exhibition",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("exhibition_title", sa.String(), nullable=True),
        sa.Column("artists", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("period", sa.String(), nullable=True),
        sa.Column("medium", sa.String(), nullable=True),
        sa.Column("curator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("permanent_or_temp", sa.String(), nullable=True),
        sa.Column("exhibition_url", sa.String(), nullable=True),
    )

    op.create_table(
        "event_screening",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event.id"), primary_key=True),
        sa.Column("subtype", sa.String(), nullable=True),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("work.id"), nullable=True),
        sa.Column("director_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("conductor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("person.id"), nullable=True),
        sa.Column("ensemble_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ensemble.id"), nullable=True),
        sa.Column("series", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("event_screening")
    op.drop_table("event_exhibition")
    op.drop_table("event_talk")
    op.drop_table("event_spoken_word")
    op.drop_table("event_comedy")
    op.drop_table("event_cabaret")
    op.drop_table("event_theatre")
    op.drop_table("event_circus")
    op.drop_table("event_dance")
    op.drop_table("ballet_programme_music")
    op.drop_table("ballet_programme_item")
    op.drop_table("event_ballet")
    op.drop_table("event_opera")
    op.drop_table("classical_programme_item")
    op.drop_table("event_classical")
    op.drop_table("event_music")
    op.drop_table("event")
    op.drop_table("production")
    op.drop_table("musical_piece")
    op.drop_table("work")
    op.drop_table("venue")
    op.drop_table("festival")
    op.drop_table("ensemble")
    op.drop_table("person")
    op.drop_table("venue_operator")

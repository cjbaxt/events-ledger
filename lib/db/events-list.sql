-- Run this in Supabase SQL Editor to create/update the events list function
CREATE OR REPLACE FUNCTION get_events_list(
  p_type text DEFAULT NULL,
  p_q text DEFAULT NULL,
  p_festival_id uuid DEFAULT NULL,
  p_limit int DEFAULT 200,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  date date,
  "time" time,
  type text,
  subtype text,
  title text,
  venue_id uuid,
  venue_name text,
  venue_city text,
  festival_id uuid,
  festival_name text,
  price_paid numeric,
  currency text,
  payment_method_id uuid,
  rating float,
  rating_context text,
  data_completeness text,
  primary_entity_name text,
  primary_entity_id uuid,
  primary_entity_kind text,
  has_review boolean,
  has_essay boolean
) LANGUAGE sql STABLE AS $$
  SELECT
    e.id,
    e.date,
    e.time,
    e.type::text,
    e.subtype::text,
    e.title::text,
    e.venue_id,
    CASE
      WHEN v.parent_id IS NOT NULL AND vp.name IS NOT NULL THEN v.name || ', ' || vp.name
      ELSE v.name
    END AS venue_name,
    v.city AS venue_city,
    e.festival_id,
    CASE
      WHEN f.id IS NOT NULL THEN trim(f.name || ' ' || coalesce(f.edition, ''))
      ELSE NULL
    END AS festival_name,
    e.price_paid,
    e.currency::text,
    e.payment_method_id,
    e.rating,
    e.rating_context::text,
    e.data_completeness::text,
    -- Primary entity name: one JOIN per extension table; only the matching type will be non-null
    COALESCE(
      p_comedy.name,
      ens_comedy.name,
      p_music.name,
      ens_music.name,
      ens_circus.name,
      ens_ballet.name,
      ens_classical.name,
      ens_opera.name,
      ens_dance.name,
      p_cabaret.name,
      ens_cabaret.name,
      p_talk.name,
      p_spoken_word.name
    ) AS primary_entity_name,
    COALESCE(
      ec.performer_id,
      ec.ensemble_id,
      em.headliner_person_id,
      em.headliner_ensemble_id,
      ecirc.company_id,
      eb.company_id,
      ecl.ensemble_id,
      eo.ensemble_id,
      edan.company_id,
      ecab.headliner_id,
      ecab.ensemble_id,
      etalk.speaker_id,
      esword.performer_id
    ) AS primary_entity_id,
    CASE
      WHEN ec.performer_id IS NOT NULL THEN 'person'
      WHEN ec.ensemble_id IS NOT NULL THEN 'ensemble'
      WHEN em.headliner_person_id IS NOT NULL THEN 'person'
      WHEN em.headliner_ensemble_id IS NOT NULL THEN 'ensemble'
      WHEN ecirc.company_id IS NOT NULL THEN 'ensemble'
      WHEN eb.company_id IS NOT NULL THEN 'ensemble'
      WHEN ecl.ensemble_id IS NOT NULL THEN 'ensemble'
      WHEN eo.ensemble_id IS NOT NULL THEN 'ensemble'
      WHEN edan.company_id IS NOT NULL THEN 'ensemble'
      WHEN ecab.headliner_id IS NOT NULL THEN 'person'
      WHEN ecab.ensemble_id IS NOT NULL THEN 'ensemble'
      WHEN etalk.speaker_id IS NOT NULL THEN 'person'
      WHEN esword.performer_id IS NOT NULL THEN 'person'
      ELSE NULL
    END AS primary_entity_kind,
    (e.review IS NOT NULL AND e.review != '') AS has_review,
    (e.links IS NOT NULL AND e.links::text LIKE '%cultural-dispatch%') AS has_essay
  FROM event e
  LEFT JOIN venue v ON v.id = e.venue_id
  LEFT JOIN venue vp ON vp.id = v.parent_id
  LEFT JOIN festival f ON f.id = e.festival_id
  -- comedy
  LEFT JOIN event_comedy ec ON ec.event_id = e.id AND e.type = 'comedy'
  LEFT JOIN person p_comedy ON p_comedy.id = ec.performer_id
  LEFT JOIN ensemble ens_comedy ON ens_comedy.id = ec.ensemble_id
  -- music
  LEFT JOIN event_music em ON em.event_id = e.id AND e.type = 'music'
  LEFT JOIN person p_music ON p_music.id = em.headliner_person_id
  LEFT JOIN ensemble ens_music ON ens_music.id = em.headliner_ensemble_id
  -- circus
  LEFT JOIN event_circus ecirc ON ecirc.event_id = e.id AND e.type = 'circus'
  LEFT JOIN ensemble ens_circus ON ens_circus.id = ecirc.company_id
  -- ballet
  LEFT JOIN event_ballet eb ON eb.event_id = e.id AND e.type = 'ballet'
  LEFT JOIN ensemble ens_ballet ON ens_ballet.id = eb.company_id
  -- classical
  LEFT JOIN event_classical ecl ON ecl.event_id = e.id AND e.type = 'classical'
  LEFT JOIN ensemble ens_classical ON ens_classical.id = ecl.ensemble_id
  -- opera
  LEFT JOIN event_opera eo ON eo.event_id = e.id AND e.type = 'opera'
  LEFT JOIN ensemble ens_opera ON ens_opera.id = eo.ensemble_id
  -- dance
  LEFT JOIN event_dance edan ON edan.event_id = e.id AND e.type = 'dance'
  LEFT JOIN ensemble ens_dance ON ens_dance.id = edan.company_id
  -- cabaret (headliner person takes priority over ensemble)
  LEFT JOIN event_cabaret ecab ON ecab.event_id = e.id AND e.type = 'cabaret'
  LEFT JOIN person p_cabaret ON p_cabaret.id = ecab.headliner_id
  LEFT JOIN ensemble ens_cabaret ON ens_cabaret.id = ecab.ensemble_id
  -- talk (array: first speaker)
  LEFT JOIN LATERAL (
    SELECT (et.speaker_ids)[1] AS speaker_id
    FROM event_talk et
    WHERE et.event_id = e.id AND e.type = 'talk'
      AND et.speaker_ids IS NOT NULL AND array_length(et.speaker_ids, 1) > 0
    LIMIT 1
  ) etalk ON true
  LEFT JOIN person p_talk ON p_talk.id = etalk.speaker_id
  -- spoken_word (array: first performer)
  LEFT JOIN LATERAL (
    SELECT (esw.performers)[1] AS performer_id
    FROM event_spoken_word esw
    WHERE esw.event_id = e.id AND e.type = 'spoken_word'
      AND esw.performers IS NOT NULL AND array_length(esw.performers, 1) > 0
    LIMIT 1
  ) esword ON true
  LEFT JOIN person p_spoken_word ON p_spoken_word.id = esword.performer_id
  WHERE
    (p_type IS NULL OR e.type = p_type)
    AND (p_festival_id IS NULL OR e.festival_id = p_festival_id)
    AND (p_q IS NULL OR e.title ILIKE '%' || p_q || '%')
  ORDER BY e.date DESC, e.time DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

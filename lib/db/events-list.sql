-- Run this in Supabase SQL Editor to create the events list function
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
    -- venue display: "Child, Parent" or just "Child"
    CASE
      WHEN v.parent_id IS NOT NULL AND vp.name IS NOT NULL
        THEN v.name || ', ' || vp.name
      ELSE v.name
    END AS venue_name,
    e.festival_id,
    CASE
      WHEN f.id IS NOT NULL
        THEN trim(f.name || ' ' || coalesce(f.edition, ''))
      ELSE NULL
    END AS festival_name,
    e.price_paid,
    e.currency::text,
    e.payment_method_id,
    e.rating,
    e.rating_context::text,
    e.data_completeness::text,
    -- primary entity: check each extension table in order
    COALESCE(
      (SELECT p.name FROM event_comedy ec JOIN person p ON p.id = ec.performer_id WHERE ec.event_id = e.id AND e.type = 'comedy'),
      (SELECT p.name FROM event_music em JOIN person p ON p.id = em.headliner_person_id WHERE em.event_id = e.id AND e.type = 'music'),
      (SELECT ens.name FROM event_music em JOIN ensemble ens ON ens.id = em.headliner_ensemble_id WHERE em.event_id = e.id AND e.type = 'music'),
      (SELECT ens.name FROM event_circus ec JOIN ensemble ens ON ens.id = ec.company_id WHERE ec.event_id = e.id AND e.type = 'circus'),
      (SELECT ens.name FROM event_ballet eb JOIN ensemble ens ON ens.id = eb.company_id WHERE eb.event_id = e.id AND e.type = 'ballet'),
      (SELECT ens.name FROM event_classical ec JOIN ensemble ens ON ens.id = ec.ensemble_id WHERE ec.event_id = e.id AND e.type = 'classical'),
      (SELECT ens.name FROM event_opera eo JOIN ensemble ens ON ens.id = eo.ensemble_id WHERE eo.event_id = e.id AND e.type = 'opera'),
      (SELECT ens.name FROM event_dance ed JOIN ensemble ens ON ens.id = ed.company_id WHERE ed.event_id = e.id AND e.type = 'dance'),
      (SELECT ens.name FROM event_cabaret ec JOIN ensemble ens ON ens.id = ec.ensemble_id WHERE ec.event_id = e.id AND e.type = 'cabaret'),
      (SELECT p.name FROM event_cabaret ec JOIN person p ON p.id = ec.headliner_id WHERE ec.event_id = e.id AND e.type = 'cabaret')
    ) AS primary_entity_name,
    COALESCE(
      (SELECT ec.performer_id FROM event_comedy ec WHERE ec.event_id = e.id AND e.type = 'comedy'),
      (SELECT em.headliner_person_id FROM event_music em WHERE em.event_id = e.id AND e.type = 'music' AND em.headliner_person_id IS NOT NULL),
      (SELECT em.headliner_ensemble_id FROM event_music em WHERE em.event_id = e.id AND e.type = 'music' AND em.headliner_ensemble_id IS NOT NULL),
      (SELECT ec2.company_id FROM event_circus ec2 WHERE ec2.event_id = e.id AND e.type = 'circus'),
      (SELECT eb.company_id FROM event_ballet eb WHERE eb.event_id = e.id AND e.type = 'ballet'),
      (SELECT ec3.ensemble_id FROM event_classical ec3 WHERE ec3.event_id = e.id AND e.type = 'classical'),
      (SELECT eo.ensemble_id FROM event_opera eo WHERE eo.event_id = e.id AND e.type = 'opera'),
      (SELECT ed.company_id FROM event_dance ed WHERE ed.event_id = e.id AND e.type = 'dance')
    ) AS primary_entity_id,
    CASE
      WHEN e.type = 'comedy' AND EXISTS (SELECT 1 FROM event_comedy ec WHERE ec.event_id = e.id AND ec.performer_id IS NOT NULL) THEN 'person'
      WHEN e.type = 'music' AND EXISTS (SELECT 1 FROM event_music em WHERE em.event_id = e.id AND em.headliner_person_id IS NOT NULL) THEN 'person'
      WHEN e.type IN ('music','circus','ballet','classical','opera','dance','cabaret') THEN 'ensemble'
      ELSE NULL
    END AS primary_entity_kind,
    (e.review IS NOT NULL AND e.review != '') AS has_review,
    (e.links IS NOT NULL AND e.links::text LIKE '%cultural-dispatch%') AS has_essay
  FROM event e
  LEFT JOIN venue v ON v.id = e.venue_id
  LEFT JOIN venue vp ON vp.id = v.parent_id
  LEFT JOIN festival f ON f.id = e.festival_id
  WHERE
    (p_type IS NULL OR e.type = p_type)
    AND (p_festival_id IS NULL OR e.festival_id = p_festival_id)
    AND (p_q IS NULL OR e.title ILIKE '%' || p_q || '%')
  ORDER BY e.date DESC, e.time DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

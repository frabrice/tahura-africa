/*
  # Auto-unpublish an attraction if its last guide is removed/reassigned

  ## Why
  Symmetric with the partner_hosts fix in this same session: the
  publish-requires-a-guide trigger only fires when institution_profiles
  itself is updated. If a published attraction's only guide gets deleted,
  or reassigned to a different attraction (guides.portal_user_id
  changes), published stays true untouched — a live attraction with zero
  guides, silently broken the same way a hostless active listing was.
*/

CREATE OR REPLACE FUNCTION public.fn_unpublish_attraction_if_no_guides()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_owner uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_owner := OLD.portal_user_id;
  ELSE
    IF NEW.portal_user_id IS NOT DISTINCT FROM OLD.portal_user_id THEN
      RETURN NEW;
    END IF;
    v_old_owner := OLD.portal_user_id;
  END IF;

  IF v_old_owner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM guides WHERE portal_user_id = v_old_owner) THEN
    UPDATE institution_profiles SET published = false WHERE portal_user_id = v_old_owner AND published = true;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_unpublish_attraction_if_no_guides ON guides;
CREATE TRIGGER trg_unpublish_attraction_if_no_guides
  AFTER UPDATE OF portal_user_id OR DELETE ON guides
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_unpublish_attraction_if_no_guides();

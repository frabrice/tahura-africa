/*
  # Enforce "can't go live without a host/guide" at the database level

  ## Why
  Ops wants to create listings and attractions in bulk before hosts/guides
  exist to assign to them — saved as drafts, edited freely, and only
  actually visible to travelers once a host (listings) or guide
  (attractions) is attached. The UI will gate this, but per this
  project's established pattern (Track B financial-field guardrails,
  is_active_ops_admin, claim_host_profile), the real invariant belongs at
  the database level so no code path — present or future — can
  accidentally publish something incomplete.

  ## Listings (partner_listings)
  A CHECK constraint: status can only be 'active' when host_id is set.
  Confirmed live before adding this that partner_listings is currently
  empty, so there's no existing data to violate it.

  ## Attractions (institution_profiles)
  Guides attach via a separate table (guides.portal_user_id = the
  institution's portal_user_id) — a CHECK constraint can't see other
  tables, so this needs a trigger: published can only flip to true if at
  least one guide's portal_user_id already points at this institution.
  Confirmed live that institution_profiles is currently empty too.
*/

ALTER TABLE partner_listings
  ADD CONSTRAINT chk_active_listing_requires_host
  CHECK (status <> 'active' OR host_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.fn_check_attraction_has_guide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true AND (OLD IS NULL OR OLD.published = false) THEN
    IF NOT EXISTS (SELECT 1 FROM guides WHERE portal_user_id = NEW.portal_user_id) THEN
      RAISE EXCEPTION 'Cannot publish an attraction with no guide assigned';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_attraction_has_guide ON institution_profiles;
CREATE TRIGGER trg_check_attraction_has_guide
  BEFORE INSERT OR UPDATE ON institution_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_attraction_has_guide();

/*
  # Gracefully demote a listing to draft when its host is deleted

  ## Why
  partner_listings.host_id has an existing ON DELETE SET NULL foreign key
  to partner_hosts. Confirmed live: deleting a host whose listing is
  currently 'active' now fails outright with a check-constraint violation
  (chk_active_listing_requires_host, added this session) instead of
  either silently leaving a hostless active listing (the old, worse
  behavior) or handling it gracefully. Partners can already delete hosts
  directly from HostsPage.tsx with no warning about their listings.

  ## Fix
  A BEFORE DELETE trigger on partner_hosts that pulls any of that host's
  'active' listings back to 'draft' first, so by the time the FK's SET
  NULL cascade actually nulls out host_id, the row is already outside the
  constraint's active-requires-host rule. Host deletion now always
  succeeds; any listing that loses its host is simply unpublished rather
  than left broken or blocking the delete.
*/

CREATE OR REPLACE FUNCTION public.fn_draft_listings_on_host_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE partner_listings SET status = 'draft', updated_at = now()
  WHERE host_id = OLD.id AND status = 'active';
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_draft_listings_on_host_delete ON partner_hosts;
CREATE TRIGGER trg_draft_listings_on_host_delete
  BEFORE DELETE ON partner_hosts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_draft_listings_on_host_delete();

/*
  # Remove leftover diagnostic test row

  A test attraction_reviews row inserted while verifying the previous
  migration's column fix couldn't be removed via the anon key - the
  table has no DELETE or UPDATE policy for it. One-time cleanup only.
*/

DELETE FROM attraction_reviews WHERE reviewer_name = 'Diagnostic Test' AND review_text = 'test - verifying schema fix';

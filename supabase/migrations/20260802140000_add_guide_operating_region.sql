/*
  # Add operating_region to guides

  Lets Operations record where each guide is based / operates, so guides can be
  matched to attractions in their region (e.g. Musanze guides -> Volcanoes NP).

  1. Changes
    - `guides.operating_region` (text, default '') - the guide's home region / area of operation
*/

ALTER TABLE guides ADD COLUMN IF NOT EXISTS operating_region text DEFAULT '';

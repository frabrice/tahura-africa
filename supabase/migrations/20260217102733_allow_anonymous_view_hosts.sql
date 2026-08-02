/*
  # Allow Anonymous Users to View Active Hosts

  1. Changes
    - Add policy for anonymous users to view active hosts
    - This enables the traveler-side host detail page to fetch host information

  2. Security
    - Only hosts with status 'active' can be viewed by anonymous users
    - Maintains restrictive access for other operations
*/

-- Allow anonymous users to view active hosts (for traveler side)
CREATE POLICY "Anonymous users can view active hosts"
  ON partner_hosts FOR SELECT
  TO anon
  USING (status = 'active');
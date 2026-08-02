/*
  # Fix Mutable Function Search Path

  Sets an immutable search_path on the `update_conversation_last_message`
  function to prevent search_path injection attacks.

  1. Changes
    - Recreates `update_conversation_last_message` with `SET search_path = public`
    - Function logic remains identical

  2. Security
    - Prevents potential privilege escalation via search_path manipulation
*/

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

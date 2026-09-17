BEGIN;

DROP POLICY "catches_insert_participant" ON public.catches;

CREATE POLICY "catches_insert_participant" ON public.catches
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event_participants AS recorder
    WHERE recorder.event_id = catches.event_id
      AND recorder.user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM public.event_participants AS angler
    WHERE angler.event_id = catches.event_id
      AND angler.user_id = catches.user_id
  ) AND
  EXISTS (
    SELECT 1 FROM public.events
    WHERE id = catches.event_id
      AND NOW() BETWEEN starts_at AND ends_at
  )
);

COMMIT;
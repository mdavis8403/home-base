ALTER TABLE mysteries ADD COLUMN package_slug text;
CREATE UNIQUE INDEX mystery_package_idx ON mysteries(family_id,package_slug);
ALTER TABLE mystery_sessions ADD COLUMN revision integer NOT NULL DEFAULT 0;
ALTER TABLE mystery_sessions ADD COLUMN content_snapshot jsonb;
CREATE UNIQUE INDEX mystery_active_idx ON mystery_sessions(family_id,mystery_id) WHERE status<>'completed';
CREATE INDEX mystery_family_idx ON mystery_sessions(family_id,completed_at DESC);

-- Every deliberate game event is serialized and version checked. Never used outside a game.
CREATE FUNCTION apply_mystery_event(f uuid,p uuid,s uuid,event uuid,expected integer,action text,new_state jsonb,next_scene text,new_status text,ready_value boolean)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE game mystery_sessions%ROWTYPE;
BEGIN
 SELECT * INTO game FROM mystery_sessions WHERE id=s AND family_id=f FOR UPDATE;
 IF game.id IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=p AND family_id=f) THEN RETURN 'missing'; END IF;
 IF EXISTS(SELECT 1 FROM mystery_events WHERE id=event AND mystery_session_id=s AND profile_id=p) THEN RETURN 'ok'; END IF;
 IF game.revision<>expected THEN RETURN 'conflict'; END IF;
 IF action='join' THEN
   IF game.status<>'lobby' THEN RETURN 'conflict'; END IF;
   INSERT INTO mystery_session_players(id,family_id,mystery_session_id,profile_id) VALUES(gen_random_uuid(),f,s,p) ON CONFLICT(mystery_session_id,profile_id) DO NOTHING;
 ELSE
   IF NOT EXISTS(SELECT 1 FROM mystery_session_players WHERE mystery_session_id=s AND profile_id=p) THEN RETURN 'missing'; END IF;
   IF action='ready' THEN
     IF game.status<>'lobby' THEN RETURN 'conflict'; END IF;
     UPDATE mystery_session_players SET ready=ready_value WHERE mystery_session_id=s AND profile_id=p;
   END IF;
   IF action='start' AND (game.status<>'lobby' OR (SELECT count(*) FROM mystery_session_players WHERE mystery_session_id=s AND ready)<>3) THEN RETURN 'conflict'; END IF;
   IF action IN ('hint','answer','advance') AND game.status<>'playing' THEN RETURN 'conflict'; END IF;
 END IF;
 UPDATE mystery_sessions SET revision=revision+1,state_json=new_state,current_scene=next_scene,status=new_status,
   started_at=CASE WHEN action='start' THEN clock_timestamp() ELSE started_at END,
   completed_at=CASE WHEN new_status='completed' THEN clock_timestamp() ELSE completed_at END WHERE id=s;
 INSERT INTO mystery_events(id,family_id,mystery_session_id,profile_id,event_type,event_data)
 VALUES(event,f,s,p,action,jsonb_build_object('scene',game.current_scene));
 RETURN 'ok';
END $$;

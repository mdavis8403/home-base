-- Family Board extends the reserved Foundation entities.
ALTER TABLE families ADD COLUMN board_reveal_time time NOT NULL DEFAULT '20:00';
ALTER TABLE families ADD COLUMN board_categories text[] NOT NULL DEFAULT ARRAY['silly','imaginative','reflective','family planning'];
ALTER TABLE families ADD CONSTRAINT board_categories_valid CHECK (
  cardinality(board_categories)>0 AND board_categories <@ ARRAY['silly','imaginative','reflective','family planning']::text[]);
ALTER TABLE board_prompts ADD COLUMN category text NOT NULL DEFAULT 'silly' CHECK (category IN ('silly','imaginative','reflective','family planning'));
ALTER TABLE board_prompts ADD COLUMN builtin_key text;
ALTER TABLE board_prompts ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX board_builtin_idx ON board_prompts(family_id,builtin_key);
CREATE INDEX board_history_idx ON board_days(family_id,date DESC);
CREATE INDEX board_media_idx ON board_responses(media_asset_id);

-- Serialized daily creation: one room, one activity, even on simultaneous opens.
-- Called only from the authenticated same-origin POST endpoint, never a GET.
CREATE FUNCTION open_family_board(f uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE fam families%ROWTYPE; chosen uuid; day_id uuid; today date;
BEGIN
  SELECT * INTO STRICT fam FROM families WHERE id=f FOR UPDATE;
  today := (clock_timestamp() AT TIME ZONE fam.timezone)::date;
  SELECT id INTO day_id FROM board_days WHERE family_id=f AND date=today;
  IF day_id IS NOT NULL THEN RETURN day_id; END IF;
  INSERT INTO board_prompts(id,family_id,prompt_type,prompt_text,category,builtin_key)
  SELECT gen_random_uuid(),f,t,p,c,k FROM (VALUES
    ('question','If our family opened a restaurant, what should it be called?','silly','01'),
    ('photo','Take a picture of something that made you smile.','reflective','02'),
    ('drawing','Draw a tiny home for a very big dragon.','imaginative','03'),
    ('question','If Max had a job, what would it be?','silly','04'),
    ('photo','Find a color you would put in our family theme park.','imaginative','05'),
    ('drawing','Draw a dessert we could make together. Extra sprinkles welcome!','family planning','06'),
    ('question','What made you laugh today? A tiny giggle counts.','reflective','07'),
    ('photo','Show us something that would make a funny hat.','silly','08'),
    ('drawing','Draw one little thing you are looking forward to.','reflective','09'),
    ('question','What should we do together this weekend?','family planning','10'),
    ('photo','Find something we could bring on a family picnic.','family planning','11'),
    ('drawing','Draw what Max does when everyone leaves the house.','silly','12'),
    ('question','If we built a theme park, what ride would you invent?','imaginative','13'),
    ('question','What would Dad name a pirate ship?','silly','14'),
    ('question','What magical power should our family have?','imaginative','15'),
    ('question','What dessert should we make next?','family planning','16')
  ) AS prompts(t,p,c,k) ON CONFLICT(family_id,builtin_key) DO NOTHING;
  -- Unused custom prompts come first. Then rotate least-recently used prompts.
  SELECT p.id INTO chosen FROM board_prompts p
  LEFT JOIN board_days b ON b.prompt_id=p.id
  WHERE p.family_id=f AND p.active AND p.category=ANY(fam.board_categories)
  GROUP BY p.id
  ORDER BY max(b.date) ASC NULLS FIRST, (p.builtin_key IS NOT NULL), p.builtin_key, p.created_at, p.id LIMIT 1;
  INSERT INTO board_days(id,family_id,date,prompt_id,reveal_at)
  VALUES(gen_random_uuid(),f,today,chosen,(today+fam.board_reveal_time) AT TIME ZONE fam.timezone)
  RETURNING id INTO day_id;
  RETURN day_id;
END $$;

-- Row lock makes the third submission and early reveal atomic across clients.
-- Metadata is inserted in the same transaction as its response; failures roll back both.
CREATE FUNCTION submit_board_response(b uuid,f uuid,p uuid,txt text,a uuid,path text,kind text,meta jsonb)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE day board_days%ROWTYPE; prompt_kind text;
BEGIN
  SELECT * INTO day FROM board_days WHERE id=b AND family_id=f FOR UPDATE;
  IF day.id IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=p AND family_id=f) THEN
    RAISE EXCEPTION 'Board unavailable';
  END IF;
  IF EXISTS(SELECT 1 FROM board_responses WHERE board_day_id=b AND profile_id=p) THEN RETURN false; END IF;
  IF day.date<>(SELECT (clock_timestamp() AT TIME ZONE timezone)::date FROM families WHERE id=f) THEN
    RAISE EXCEPTION 'Board is archived';
  END IF;
  SELECT prompt_type INTO prompt_kind FROM board_prompts WHERE id=day.prompt_id;
  IF (prompt_kind='question' AND (a IS NOT NULL OR length(trim(txt)) NOT BETWEEN 1 AND 3000))
    OR (prompt_kind<>'question' AND (a IS NULL OR txt<>'' OR kind IS DISTINCT FROM CASE WHEN prompt_kind='photo' THEN 'photo' ELSE 'doodle' END)) THEN
    RAISE EXCEPTION 'Wrong response type';
  END IF;
  IF a IS NOT NULL THEN
    INSERT INTO media_assets(id,family_id,owner_profile_id,related_entity_type,related_entity_id,storage_path,media_type,metadata)
    VALUES(a,f,p,'board',b,path,kind,meta);
  END IF;
  INSERT INTO board_responses(id,family_id,board_day_id,profile_id,text_response,media_asset_id)
  VALUES(gen_random_uuid(),f,b,p,txt,a);
  IF (SELECT count(*) FROM board_responses WHERE board_day_id=b)=3 THEN
    UPDATE board_days SET revealed_at=coalesce(revealed_at,least(clock_timestamp(),reveal_at)) WHERE id=b;
  END IF;
  RETURN true;
END $$;

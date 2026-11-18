ALTER TYPE "public"."result_stage" ADD VALUE 'monthly_2' BEFORE 'term';--> statement-breakpoint
ALTER TYPE "public"."result_stage" ADD VALUE 'monthly_3' BEFORE 'term';--> statement-breakpoint
ALTER TABLE "exam_terms" ADD COLUMN "monthly_tests" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_terms" ADD CONSTRAINT "exam_terms_monthly_tests_range" CHECK (monthly_tests between 1 and 3);--> statement-breakpoint

-- =============================================================================
-- Hand-written part: several monthly tests per term.
-- Each monthly test has its own assessment type (MONTHLY = Monthly Test 1, MONTHLY_2, MONTHLY_3) and its
-- own stage (monthly, monthly_2, monthly_3). A term only gets the monthly components it uses
-- (exam_terms.monthly_tests). Existing terms keep one monthly test, so nothing changes for them.
-- =============================================================================

-- 1. Assessment types for the 2nd and 3rd monthly tests, ordered between the first and the term exam.
UPDATE public.assessment_types SET sort_order = 10 WHERE code = 'TERM_EXAM' AND sort_order < 10;
--> statement-breakpoint
INSERT INTO public.assessment_types (code, name, default_max_marks, sort_order) VALUES
  ('MONTHLY_2', 'Monthly Test 2', 25, 2),
  ('MONTHLY_3', 'Monthly Test 3', 25, 3)
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint

-- 2. Which stage a component belongs to. PL/pgSQL (not SQL) so that the new enum values are only
--    read when the function runs, after this migration has committed.
CREATE OR REPLACE FUNCTION app_private.assessment_stage(p_assessment_id uuid) RETURNS public.result_stage
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_code text;
BEGIN
  SELECT t.code INTO v_code
    FROM public.assessments a JOIN public.assessment_types t ON t.id = a.assessment_type_id
   WHERE a.id = p_assessment_id;
  IF v_code IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (CASE v_code WHEN 'MONTHLY' THEN 'monthly' WHEN 'MONTHLY_2' THEN 'monthly_2' WHEN 'MONTHLY_3' THEN 'monthly_3' ELSE 'term' END)::public.result_stage;
END $$;

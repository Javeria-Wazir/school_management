-- =============================================================================
-- Hand-written migration: monthly results.
-- A term is published in two stages. The Monthly Test component has its own mark sheets, result
-- approval and remarks ("monthly"); the other components (Term Examination …) have theirs ("term"),
-- and the term result combines both. This file moves existing Monthly Test marks onto monthly
-- sheets and makes the guard triggers stage-aware.
-- =============================================================================

-- 1. Existing data: a term sheet holding Monthly Test marks gets a monthly twin (same status and
--    history) and those marks move to it. The row triggers are paused for the move only, because
--    marks on submitted sheets are otherwise locked; one audit entry records the migration.
ALTER TABLE public.mark_sheets DISABLE TRIGGER USER;
--> statement-breakpoint
ALTER TABLE public.marks DISABLE TRIGGER USER;
--> statement-breakpoint
INSERT INTO public.mark_sheets (exam_term_id, section_id, class_subject_id, stage, status, deadline, submitted_by, submitted_at,
                                reviewed_by, reviewed_at, approved_by, approved_at, return_reason, created_at, updated_at)
SELECT ms.exam_term_id, ms.section_id, ms.class_subject_id, 'monthly', ms.status, ms.deadline, ms.submitted_by, ms.submitted_at,
       ms.reviewed_by, ms.reviewed_at, ms.approved_by, ms.approved_at, ms.return_reason, ms.created_at, ms.updated_at
  FROM public.mark_sheets ms
 WHERE ms.stage = 'term'
   AND EXISTS (SELECT 1 FROM public.marks m
                 JOIN public.assessments a ON a.id = m.assessment_id
                 JOIN public.assessment_types t ON t.id = a.assessment_type_id
                WHERE m.mark_sheet_id = ms.id AND t.code = 'MONTHLY');
--> statement-breakpoint
UPDATE public.marks m
   SET mark_sheet_id = monthly.id
  FROM public.mark_sheets term_sheet, public.mark_sheets monthly, public.assessments a, public.assessment_types t
 WHERE m.mark_sheet_id = term_sheet.id AND term_sheet.stage = 'term'
   AND monthly.exam_term_id = term_sheet.exam_term_id AND monthly.section_id = term_sheet.section_id
   AND monthly.class_subject_id = term_sheet.class_subject_id AND monthly.stage = 'monthly'
   AND a.id = m.assessment_id AND t.id = a.assessment_type_id AND t.code = 'MONTHLY';
--> statement-breakpoint
INSERT INTO public.audit_logs (action, table_name, reason)
SELECT 'MIGRATION', 'marks', 'Monthly Test marks moved to their own monthly mark sheets (migration 0003)'
 WHERE EXISTS (SELECT 1 FROM public.mark_sheets WHERE stage = 'monthly');
--> statement-breakpoint
ALTER TABLE public.marks ENABLE TRIGGER USER;
--> statement-breakpoint
ALTER TABLE public.mark_sheets ENABLE TRIGGER USER;
--> statement-breakpoint

-- 2. Which stage a component belongs to: the Monthly Test is "monthly", everything else "term".
CREATE OR REPLACE FUNCTION app_private.assessment_stage(p_assessment_id uuid) RETURNS public.result_stage
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN t.code = 'MONTHLY' THEN 'monthly'::public.result_stage ELSE 'term'::public.result_stage END
    FROM public.assessments a JOIN public.assessment_types t ON t.id = a.assessment_type_id
   WHERE a.id = p_assessment_id
$$;
--> statement-breakpoint

-- 3. Locks: a monthly sheet is frozen by an approved monthly result or an approved term result
--    (the term result includes the monthly marks); a term sheet only by the approved term result.
CREATE OR REPLACE FUNCTION app_private.result_locked(p_exam_term_id uuid, p_section_id uuid, p_stage public.result_stage) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.result_approvals ra
                 WHERE ra.exam_term_id = p_exam_term_id AND ra.section_id = p_section_id AND ra.status <> 'open'
                   AND (ra.stage = 'term' OR ra.stage = p_stage))
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.mark_sheets_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.exam_term_id, NEW.section_id, NEW.class_subject_id, NEW.stage) IS DISTINCT FROM (OLD.exam_term_id, OLD.section_id, OLD.class_subject_id, OLD.stage) THEN
      RAISE EXCEPTION 'A mark sheet cannot be moved to another term, section, subject or stage';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
           (OLD.status IN ('draft', 'returned') AND NEW.status = 'submitted')
        OR (OLD.status = 'submitted' AND NEW.status IN ('under_review', 'approved'))
        OR (OLD.status = 'under_review' AND NEW.status = 'approved')
        OR (OLD.status IN ('submitted', 'under_review', 'approved') AND NEW.status = 'returned')
      ) THEN
        RAISE EXCEPTION 'A mark sheet cannot move from % to %', OLD.status, NEW.status;
      END IF;
      IF app_private.result_locked(OLD.exam_term_id, OLD.section_id, OLD.stage) THEN
        RAISE EXCEPTION 'The class result is approved. Reopen it (with a reason) before changing this subject.';
      END IF;
      IF NEW.status = 'returned' AND length(trim(coalesce(NEW.return_reason, ''))) < 5 THEN
        RAISE EXCEPTION 'Please give a reason (at least 5 characters)';
      END IF;
    END IF;
  ELSIF NEW.status <> 'draft' THEN
    RAISE EXCEPTION 'A new mark sheet must start as a draft';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.result_approvals_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'final_approved' AND NEW.class_approved_at IS NULL THEN
      RAISE EXCEPTION 'The class result must be approved by the class teacher first';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW.exam_term_id, NEW.section_id, NEW.stage) IS DISTINCT FROM (OLD.exam_term_id, OLD.section_id, OLD.stage) THEN
    RAISE EXCEPTION 'A class result cannot be moved to another term, section or stage';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
         (OLD.status = 'open' AND NEW.status IN ('class_approved', 'final_approved'))
      OR (OLD.status = 'class_approved' AND NEW.status = 'final_approved')
      OR (OLD.status IN ('class_approved', 'final_approved') AND NEW.status = 'open')
    ) THEN
      RAISE EXCEPTION 'A class result cannot move from % to %', OLD.status, NEW.status;
    END IF;
    IF NEW.status = 'open' AND (length(trim(coalesce(NEW.reopen_reason, ''))) < 5 OR NEW.reopened_at IS NOT DISTINCT FROM OLD.reopened_at) THEN
      RAISE EXCEPTION 'Reopening an approved result needs a reason (at least 5 characters)';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint

-- Marks: as before, plus the component must belong to the sheet's stage.
CREATE OR REPLACE FUNCTION app_private.marks_validate() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_sheet record;
  v_locked boolean;
  v_max numeric;
  v_allow_decimals boolean;
  v_places smallint;
  v_sheet_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.mark_sheet_id ELSE NEW.mark_sheet_id END;
BEGIN
  SELECT * INTO v_sheet FROM public.mark_sheets WHERE id = v_sheet_id;
  v_locked := app_private.result_locked(v_sheet.exam_term_id, v_sheet.section_id, v_sheet.stage);
  IF v_sheet.status NOT IN ('draft', 'returned') OR v_locked THEN
    RAISE EXCEPTION 'This mark sheet is locked (status: %). Ask the class teacher to return it for correction.',
      CASE WHEN v_locked THEN 'class result approved' ELSE v_sheet.status::text END;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.mark_sheet_id, NEW.assessment_id, NEW.enrollment_id)
                          IS DISTINCT FROM (OLD.mark_sheet_id, OLD.assessment_id, OLD.enrollment_id) THEN
    RAISE EXCEPTION 'A mark cannot be moved to another sheet, assessment or student';
  END IF;

  SELECT a.max_marks INTO v_max FROM public.assessments a
   WHERE a.id = NEW.assessment_id AND a.exam_term_id = v_sheet.exam_term_id AND a.class_subject_id = v_sheet.class_subject_id;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'The assessment does not belong to this mark sheet';
  END IF;
  IF app_private.assessment_stage(NEW.assessment_id) <> v_sheet.stage THEN
    RAISE EXCEPTION 'Monthly Test marks belong on the monthly mark sheet, other marks on the term mark sheet';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = NEW.enrollment_id AND e.section_id = v_sheet.section_id) THEN
    RAISE EXCEPTION 'The student is not enrolled in this section';
  END IF;

  IF NEW.marks_obtained IS NOT NULL THEN
    IF NEW.marks_obtained < 0 OR NEW.marks_obtained > v_max THEN
      RAISE EXCEPTION 'Marks must be between 0 and % (entered %)', trim_scale(v_max), trim_scale(NEW.marks_obtained);
    END IF;
    SELECT allow_decimal_marks, decimal_places INTO v_allow_decimals, v_places FROM public.school_settings WHERE id = 1;
    IF NOT coalesce(v_allow_decimals, false) AND NEW.marks_obtained <> trunc(NEW.marks_obtained) THEN
      RAISE EXCEPTION 'Decimal marks are not allowed (entered %)', trim_scale(NEW.marks_obtained);
    END IF;
    IF coalesce(v_allow_decimals, false) AND NEW.marks_obtained <> round(NEW.marks_obtained, coalesce(v_places, 2)) THEN
      RAISE EXCEPTION 'Marks may have at most % decimal places', v_places;
    END IF;
  END IF;

  NEW.entered_by := coalesce(app_private.actor_id(), NEW.entered_by);
  RETURN NEW;
END $$;
--> statement-breakpoint

-- Maximum marks lock once the sheet of the same stage is past draft (a submitted Monthly Test no
-- longer blocks a change to the Term Examination maximum, and the other way round).
CREATE OR REPLACE FUNCTION app_private.assessments_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.exam_term_id, NEW.class_subject_id, NEW.assessment_type_id)
     IS DISTINCT FROM (OLD.exam_term_id, OLD.class_subject_id, OLD.assessment_type_id) THEN
    RAISE EXCEPTION 'Create a new assessment instead of moving an existing one';
  END IF;
  IF NEW.max_marks IS DISTINCT FROM OLD.max_marks THEN
    IF EXISTS (SELECT 1 FROM public.mark_sheets ms WHERE ms.exam_term_id = OLD.exam_term_id
               AND ms.class_subject_id = OLD.class_subject_id AND ms.stage = app_private.assessment_stage(OLD.id)
               AND ms.status NOT IN ('draft', 'returned')) THEN
      RAISE EXCEPTION 'Maximum marks cannot change after marks have been submitted';
    END IF;
    IF EXISTS (SELECT 1 FROM public.marks m WHERE m.assessment_id = OLD.id AND m.marks_obtained > NEW.max_marks) THEN
      RAISE EXCEPTION 'Some students already have marks above the new maximum of %', trim_scale(NEW.max_marks);
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint

DROP FUNCTION IF EXISTS app_private.result_locked(uuid, uuid);

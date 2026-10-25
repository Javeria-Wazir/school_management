-- =============================================================================
-- Hand-written migration: triggers, guard functions and default configuration.
-- The application enforces every rule in its service layer; these triggers are the
-- last line of defence so that no code path (or manual SQL) can break an invariant.
-- Statements are separated by "statement-breakpoint" markers so every driver runs them one at a time.
-- Errors meant for users are raised with the default SQLSTATE P0001; the app shows their text.
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS app_private;
--> statement-breakpoint

-- The services set `app.actor_id` (transaction-local) before writing, so triggers know who acted.
CREATE OR REPLACE FUNCTION app_private.actor_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.actor_id', true), '')::uuid
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
--> statement-breakpoint

-- -----------------------------------------------------------------------------
-- Audit log: append-only, before/after values of every sensitive row change.
-- Secrets (password hashes) and bulky values (logo) are never copied into it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.audit_row_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) - 'logo_base64' - 'password_hash' END;
  v_new jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) - 'logo_base64' - 'password_hash' END;
  v_reason text := coalesce(v_new ->> 'change_reason', nullif(current_setting('app.reason', true), ''));
BEGIN
  IF TG_OP = 'UPDATE' AND (v_old - 'updated_at' - 'last_login_at') = (v_new - 'updated_at' - 'last_login_at') THEN
    RETURN NEW;  -- nothing that matters changed (e.g. a sign-in timestamp)
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data, reason)
  VALUES (app_private.actor_id(), TG_OP, TG_TABLE_NAME, coalesce(v_new ->> 'id', v_old ->> 'id'), v_old, v_new, v_reason);
  RETURN coalesce(NEW, OLD);
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.audit_logs_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries cannot be changed or deleted';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION app_private.audit_logs_immutable();
--> statement-breakpoint

-- -----------------------------------------------------------------------------
-- Staff accounts: the last active administrator can never be removed, and an
-- administrator cannot remove their own access (another administrator must).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.users_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role = 'admin' AND OLD.is_active
     AND (TG_OP = 'DELETE' OR NEW.role <> 'admin' OR NOT NEW.is_active) THEN
    PERFORM pg_advisory_xact_lock(hashtext('app_private.users_guard'));  -- serialise concurrent demotions
    IF app_private.actor_id() = OLD.id THEN
      RAISE EXCEPTION 'You cannot remove your own administrator access. Ask another administrator.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin' AND is_active AND id <> OLD.id) THEN
      RAISE EXCEPTION 'At least one active administrator is required';
    END IF;
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
--> statement-breakpoint
CREATE TRIGGER users_guard BEFORE UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION app_private.users_guard();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.require_active_user(p_user_id uuid, p_what text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND is_active) THEN
    RAISE EXCEPTION '% must be an active staff account', p_what;
  END IF;
END $$;
--> statement-breakpoint

-- -----------------------------------------------------------------------------
-- Academic structure consistency
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.sections_check_class_teacher() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.class_teacher_id IS DISTINCT FROM OLD.class_teacher_id THEN
    PERFORM app_private.require_active_user(NEW.class_teacher_id, 'The class teacher');
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER sections_check_class_teacher BEFORE INSERT OR UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION app_private.sections_check_class_teacher();
--> statement-breakpoint

-- class_id / academic_year_id are denormalised onto enrolments for the roll-number constraint; keep them honest.
CREATE OR REPLACE FUNCTION app_private.enrollments_check() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE s record;
BEGIN
  SELECT class_id, academic_year_id INTO s FROM public.sections WHERE id = NEW.section_id;
  IF s.class_id IS DISTINCT FROM NEW.class_id OR s.academic_year_id IS DISTINCT FROM NEW.academic_year_id THEN
    RAISE EXCEPTION 'The section does not belong to the selected class and academic year';
  END IF;
  IF TG_OP = 'UPDATE'
     AND (NEW.student_id, NEW.academic_year_id, NEW.class_id, NEW.section_id)
         IS DISTINCT FROM (OLD.student_id, OLD.academic_year_id, OLD.class_id, OLD.section_id)
     AND EXISTS (SELECT 1 FROM public.marks WHERE enrollment_id = OLD.id) THEN
    RAISE EXCEPTION 'This student already has marks in this class. Withdraw the enrolment and create a new one instead of moving it.';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER enrollments_check BEFORE INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION app_private.enrollments_check();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.teacher_assignments_check() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM app_private.require_active_user(NEW.teacher_id, 'The subject teacher');
  IF NOT EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.class_subjects cs ON cs.class_id = s.class_id AND cs.academic_year_id = s.academic_year_id
    WHERE s.id = NEW.section_id AND cs.id = NEW.class_subject_id
  ) THEN
    RAISE EXCEPTION 'The subject is not configured for this section''s class and academic year';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER teacher_assignments_check BEFORE INSERT OR UPDATE ON public.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION app_private.teacher_assignments_check();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.school_settings_check_term() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_exam_term_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.exam_terms t
    WHERE t.id = NEW.current_exam_term_id AND t.academic_year_id IS NOT DISTINCT FROM NEW.current_academic_year_id
  ) THEN
    RAISE EXCEPTION 'The current exam term must belong to the current academic year';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER school_settings_check_term BEFORE INSERT OR UPDATE ON public.school_settings
  FOR EACH ROW EXECUTE FUNCTION app_private.school_settings_check_term();
--> statement-breakpoint

-- -----------------------------------------------------------------------------
-- Results workflow guards
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.result_locked(p_exam_term_id uuid, p_section_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.result_approvals ra
                 WHERE ra.exam_term_id = p_exam_term_id AND ra.section_id = p_section_id AND ra.status <> 'open')
$$;
--> statement-breakpoint

-- Only the documented status transitions are possible, and never while the class result is approved.
CREATE OR REPLACE FUNCTION app_private.mark_sheets_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.exam_term_id, NEW.section_id, NEW.class_subject_id) IS DISTINCT FROM (OLD.exam_term_id, OLD.section_id, OLD.class_subject_id) THEN
      RAISE EXCEPTION 'A mark sheet cannot be moved to another term, section or subject';
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
      IF app_private.result_locked(OLD.exam_term_id, OLD.section_id) THEN
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
CREATE TRIGGER mark_sheets_guard BEFORE INSERT OR UPDATE ON public.mark_sheets
  FOR EACH ROW EXECUTE FUNCTION app_private.mark_sheets_guard();
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
  IF (NEW.exam_term_id, NEW.section_id) IS DISTINCT FROM (OLD.exam_term_id, OLD.section_id) THEN
    RAISE EXCEPTION 'A class result cannot be moved to another term or section';
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
CREATE TRIGGER result_approvals_guard BEFORE INSERT OR UPDATE ON public.result_approvals
  FOR EACH ROW EXECUTE FUNCTION app_private.result_approvals_guard();
--> statement-breakpoint

-- Marks: within 0..maximum, decimals only if allowed, belong to the sheet's term/subject/section,
-- and only while the sheet is draft/returned and the class result is open. Applies to every caller.
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
  v_locked := app_private.result_locked(v_sheet.exam_term_id, v_sheet.section_id);
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
CREATE TRIGGER marks_validate BEFORE INSERT OR UPDATE OR DELETE ON public.marks
  FOR EACH ROW EXECUTE FUNCTION app_private.marks_validate();
--> statement-breakpoint

-- Maximum marks cannot change once the sheet is past draft, or below an already-entered mark.
CREATE OR REPLACE FUNCTION app_private.assessments_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.exam_term_id, NEW.class_subject_id, NEW.assessment_type_id)
     IS DISTINCT FROM (OLD.exam_term_id, OLD.class_subject_id, OLD.assessment_type_id) THEN
    RAISE EXCEPTION 'Create a new assessment instead of moving an existing one';
  END IF;
  IF NEW.max_marks IS DISTINCT FROM OLD.max_marks THEN
    IF EXISTS (SELECT 1 FROM public.mark_sheets ms WHERE ms.exam_term_id = OLD.exam_term_id
               AND ms.class_subject_id = OLD.class_subject_id AND ms.status NOT IN ('draft', 'returned')) THEN
      RAISE EXCEPTION 'Maximum marks cannot change after marks have been submitted';
    END IF;
    IF EXISTS (SELECT 1 FROM public.marks m WHERE m.assessment_id = OLD.id AND m.marks_obtained > NEW.max_marks) THEN
      RAISE EXCEPTION 'Some students already have marks above the new maximum of %', trim_scale(NEW.max_marks);
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER assessments_guard BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION app_private.assessments_guard();
--> statement-breakpoint

-- An approved result can never be silently recalculated: its grading scale, pass rules,
-- grade boundaries and counted subjects are frozen until the result is reopened.
CREATE OR REPLACE FUNCTION app_private.scale_locked(p_scale_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.result_approvals ra
    JOIN public.exam_terms t ON t.id = ra.exam_term_id
    WHERE ra.status <> 'open'
      AND (t.grading_scale_id = p_scale_id
           OR (t.grading_scale_id IS NULL AND EXISTS (SELECT 1 FROM public.grading_scales g WHERE g.id = p_scale_id AND g.is_default))))
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.grading_scales_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (NEW.subject_pass_percentage, NEW.overall_pass_percentage, NEW.require_all_compulsory_pass, NEW.is_default)
     IS DISTINCT FROM (OLD.subject_pass_percentage, OLD.overall_pass_percentage, OLD.require_all_compulsory_pass, OLD.is_default) THEN
    IF app_private.scale_locked(OLD.id) THEN
      RAISE EXCEPTION 'This grading scale is used by approved results. Create a new scale for future terms, or reopen those results first.';
    END IF;
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
--> statement-breakpoint
CREATE TRIGGER grading_scales_guard BEFORE UPDATE OR DELETE ON public.grading_scales
  FOR EACH ROW EXECUTE FUNCTION app_private.grading_scales_guard();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.grade_boundaries_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_private.scale_locked(coalesce(NEW.grading_scale_id, OLD.grading_scale_id))
     OR (TG_OP = 'UPDATE' AND app_private.scale_locked(OLD.grading_scale_id)) THEN
    RAISE EXCEPTION 'This grading scale is used by approved results. Create a new scale for future terms, or reopen those results first.';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
--> statement-breakpoint
CREATE TRIGGER grade_boundaries_guard BEFORE INSERT OR UPDATE OR DELETE ON public.grade_boundaries
  FOR EACH ROW EXECUTE FUNCTION app_private.grade_boundaries_guard();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.exam_terms_scale_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.grading_scale_id IS DISTINCT FROM OLD.grading_scale_id
     AND EXISTS (SELECT 1 FROM public.result_approvals WHERE exam_term_id = OLD.id AND status <> 'open') THEN
    RAISE EXCEPTION 'The grading scale cannot change after results for this term have been approved.';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER exam_terms_scale_guard BEFORE UPDATE ON public.exam_terms
  FOR EACH ROW EXECUTE FUNCTION app_private.exam_terms_scale_guard();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_private.class_subjects_result_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.is_compulsory, NEW.include_in_total, NEW.is_active, NEW.subject_id, NEW.class_id, NEW.academic_year_id)
     IS DISTINCT FROM (OLD.is_compulsory, OLD.include_in_total, OLD.is_active, OLD.subject_id, OLD.class_id, OLD.academic_year_id)
     AND EXISTS (SELECT 1 FROM public.result_approvals ra JOIN public.sections s ON s.id = ra.section_id
                 WHERE s.class_id = OLD.class_id AND s.academic_year_id = OLD.academic_year_id AND ra.status <> 'open') THEN
    RAISE EXCEPTION 'Subjects of this class cannot change while a class result is approved. Reopen the result first.';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER class_subjects_result_guard BEFORE UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE FUNCTION app_private.class_subjects_result_guard();
--> statement-breakpoint

-- -----------------------------------------------------------------------------
-- Default configuration (the principal can change all of it in the app)
-- -----------------------------------------------------------------------------
INSERT INTO public.school_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO public.assessment_types (code, name, default_max_marks, sort_order) VALUES
  ('MONTHLY', 'Monthly Test', 25, 1),
  ('TERM_EXAM', 'Term Examination', 75, 2)
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.grading_scales (name, subject_pass_percentage, overall_pass_percentage, require_all_compulsory_pass, is_default)
VALUES ('Standard Scale', 33, 33, true, true)
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.grade_boundaries (grading_scale_id, grade, min_percentage, remark)
SELECT gs.id, b.grade, b.min_pct, b.remark
  FROM public.grading_scales gs
 CROSS JOIN (VALUES ('A+', 90, 'Outstanding'), ('A', 80, 'Excellent'), ('B', 70, 'Very Good'),
                    ('C', 60, 'Good'), ('D', 50, 'Satisfactory'), ('E', 33, 'Pass'),
                    ('F', 0, 'Fail')) AS b(grade, min_pct, remark)
 WHERE gs.name = 'Standard Scale'
ON CONFLICT (grading_scale_id, grade) DO NOTHING;
--> statement-breakpoint

-- -----------------------------------------------------------------------------
-- updated_at and audit triggers (created after the defaults so seeding is not audited)
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'academic_years', 'classes', 'sections', 'subjects', 'class_subjects',
    'students', 'enrollments', 'grading_scales', 'grade_boundaries', 'exam_terms', 'assessment_types',
    'assessments', 'teacher_assignments', 'mark_sheets', 'marks', 'correction_requests', 'result_approvals',
    'student_remarks', 'school_settings']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at()',
                   t || '_set_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_private.audit_row_change()',
                   t || '_audit', t);
  END LOOP;
END $$;

CREATE TYPE "public"."correction_status" AS ENUM('open', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."mark_sheet_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'returned');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('open', 'class_approved', 'final_approved');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'archived', 'transferred', 'graduated');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'teacher');--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_years_name_unique" UNIQUE("name"),
	CONSTRAINT "academic_years_name_format" CHECK (name ~ '^[0-9]{4}-[0-9]{4}$'),
	CONSTRAINT "academic_years_dates" CHECK (end_date > start_date)
);
--> statement-breakpoint
CREATE TABLE "assessment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"default_max_marks" numeric(6, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_types_code_unique" UNIQUE("code"),
	CONSTRAINT "assessment_types_code_format" CHECK (code ~ '^[A-Z0-9_]{1,20}$'),
	CONSTRAINT "assessment_types_name_length" CHECK (length(trim(name)) between 1 and 60),
	CONSTRAINT "assessment_types_max_range" CHECK (default_max_marks > 0 and default_max_marks <= 1000)
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_term_id" uuid NOT NULL,
	"class_subject_id" uuid NOT NULL,
	"assessment_type_id" uuid NOT NULL,
	"max_marks" numeric(6, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_unique" UNIQUE("exam_term_id","class_subject_id","assessment_type_id"),
	CONSTRAINT "assessments_max_range" CHECK (max_marks > 0 and max_marks <= 1000)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text,
	"old_data" jsonb,
	"new_data" jsonb,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "class_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"is_compulsory" boolean DEFAULT true NOT NULL,
	"include_in_total" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_subjects_unique" UNIQUE("class_id","academic_year_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_name_length" CHECK (length(trim(name)) between 1 and 50)
);
--> statement-breakpoint
CREATE TABLE "correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mark_sheet_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "correction_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "correction_requests_reason_length" CHECK (length(trim(reason)) between 5 and 500),
	CONSTRAINT "correction_requests_note_length" CHECK (resolution_note is null or length(resolution_note) <= 500)
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"roll_number" integer NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_roll_unique" UNIQUE("academic_year_id","class_id","roll_number"),
	CONSTRAINT "enrollments_student_year_unique" UNIQUE("student_id","academic_year_id"),
	CONSTRAINT "enrollments_roll_range" CHECK (roll_number between 1 and 99999)
);
--> statement-breakpoint
CREATE TABLE "exam_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"end_date" date,
	"marks_deadline" date,
	"grading_scale_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_terms_year_name_unique" UNIQUE("academic_year_id","name"),
	CONSTRAINT "exam_terms_name_length" CHECK (length(trim(name)) between 1 and 60),
	CONSTRAINT "exam_terms_dates" CHECK (end_date is null or start_date is null or end_date >= start_date)
);
--> statement-breakpoint
CREATE TABLE "grade_boundaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grading_scale_id" uuid NOT NULL,
	"grade" text NOT NULL,
	"min_percentage" numeric(5, 2) NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grade_boundaries_grade_unique" UNIQUE("grading_scale_id","grade"),
	CONSTRAINT "grade_boundaries_min_unique" UNIQUE("grading_scale_id","min_percentage"),
	CONSTRAINT "grade_boundaries_grade_length" CHECK (length(trim(grade)) between 1 and 5),
	CONSTRAINT "grade_boundaries_min_range" CHECK (min_percentage between 0 and 100),
	CONSTRAINT "grade_boundaries_remark_length" CHECK (length(remark) <= 60)
);
--> statement-breakpoint
CREATE TABLE "grading_scales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject_pass_percentage" numeric(5, 2) DEFAULT '33' NOT NULL,
	"overall_pass_percentage" numeric(5, 2) DEFAULT '33' NOT NULL,
	"require_all_compulsory_pass" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grading_scales_name_unique" UNIQUE("name"),
	CONSTRAINT "grading_scales_name_length" CHECK (length(trim(name)) between 1 and 60),
	CONSTRAINT "grading_scales_subject_pass_range" CHECK (subject_pass_percentage between 0 and 100),
	CONSTRAINT "grading_scales_overall_pass_range" CHECK (overall_pass_percentage between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email_key" text NOT NULL,
	"ip_address" text,
	"success" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mark_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_term_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"class_subject_id" uuid NOT NULL,
	"status" "mark_sheet_status" DEFAULT 'draft' NOT NULL,
	"deadline" date,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"return_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mark_sheets_unique" UNIQUE("exam_term_id","section_id","class_subject_id")
);
--> statement-breakpoint
CREATE TABLE "marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mark_sheet_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"marks_obtained" numeric(6, 2),
	"entered_by" uuid,
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marks_unique" UNIQUE("assessment_id","enrollment_id"),
	CONSTRAINT "marks_non_negative" CHECK (marks_obtained is null or marks_obtained >= 0),
	CONSTRAINT "marks_change_reason_length" CHECK (change_reason is null or length(change_reason) <= 300)
);
--> statement-breakpoint
CREATE TABLE "result_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_term_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"status" "result_status" DEFAULT 'open' NOT NULL,
	"class_approved_by" uuid,
	"class_approved_at" timestamp with time zone,
	"final_approved_by" uuid,
	"final_approved_at" timestamp with time zone,
	"published_on" date,
	"reopened_by" uuid,
	"reopened_at" timestamp with time zone,
	"reopen_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "result_approvals_unique" UNIQUE("exam_term_id","section_id")
);
--> statement-breakpoint
CREATE TABLE "school_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"school_name" text DEFAULT 'School Name' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text,
	"email" text,
	"logo_base64" text,
	"logo_mime" text,
	"current_academic_year_id" uuid,
	"current_exam_term_id" uuid,
	"report_card_title" text DEFAULT 'Result Card' NOT NULL,
	"report_card_footer" text DEFAULT '' NOT NULL,
	"show_subject_grades" boolean DEFAULT true NOT NULL,
	"show_subject_status" boolean DEFAULT true NOT NULL,
	"show_class_position" boolean DEFAULT false NOT NULL,
	"allow_decimal_marks" boolean DEFAULT false NOT NULL,
	"decimal_places" smallint DEFAULT 2 NOT NULL,
	"require_principal_approval" boolean DEFAULT true NOT NULL,
	"default_country_code" text DEFAULT '92' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "school_settings_singleton" CHECK (id = 1),
	CONSTRAINT "school_settings_name_length" CHECK (length(trim(school_name)) between 2 and 150),
	CONSTRAINT "school_settings_address_length" CHECK (length(address) <= 300),
	CONSTRAINT "school_settings_phone_format" CHECK (phone is null or phone ~ '^[+][1-9][0-9]{7,14}$'),
	CONSTRAINT "school_settings_email_format" CHECK (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
	CONSTRAINT "school_settings_logo_size" CHECK (logo_base64 is null or length(logo_base64) <= 700000),
	CONSTRAINT "school_settings_logo_mime" CHECK (logo_mime is null or logo_mime in ('image/png', 'image/jpeg')),
	CONSTRAINT "school_settings_logo_pair" CHECK ((logo_base64 is null) = (logo_mime is null)),
	CONSTRAINT "school_settings_title_length" CHECK (length(report_card_title) between 1 and 80),
	CONSTRAINT "school_settings_footer_length" CHECK (length(report_card_footer) <= 300),
	CONSTRAINT "school_settings_decimal_places" CHECK (decimal_places between 0 and 2),
	CONSTRAINT "school_settings_country_code" CHECK (default_country_code ~ '^[1-9][0-9]{0,3}$')
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"class_teacher_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sections_class_year_name_unique" UNIQUE("class_id","academic_year_id","name"),
	CONSTRAINT "sections_name_length" CHECK (length(trim(name)) between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "student_remarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_term_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"remarks" text NOT NULL,
	"written_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_remarks_unique" UNIQUE("exam_term_id","enrollment_id"),
	CONSTRAINT "student_remarks_length" CHECK (length(remarks) <= 500)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_code" text NOT NULL,
	"full_name" text NOT NULL,
	"guardian_name" text,
	"guardian_phone" text,
	"date_of_birth" date,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_code_format" CHECK (student_code ~ '^[A-Za-z0-9/_-]{1,30}$'),
	CONSTRAINT "students_full_name_length" CHECK (length(trim(full_name)) between 1 and 120),
	CONSTRAINT "students_guardian_name_length" CHECK (guardian_name is null or length(guardian_name) <= 120),
	CONSTRAINT "students_guardian_phone_format" CHECK (guardian_phone is null or guardian_phone ~ '^[+][1-9][0-9]{7,14}$')
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code"),
	CONSTRAINT "subjects_name_length" CHECK (length(trim(name)) between 1 and 60),
	CONSTRAINT "subjects_code_format" CHECK (code ~ '^[A-Z0-9_-]{1,12}$')
);
--> statement-breakpoint
CREATE TABLE "teacher_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"class_subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_assignments_unique" UNIQUE("section_id","class_subject_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'teacher' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"password_hash" text NOT NULL,
	"password_changed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_format" CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' and length(email) <= 254),
	CONSTRAINT "users_full_name_length" CHECK (length(trim(full_name)) between 1 and 120),
	CONSTRAINT "users_phone_format" CHECK (phone is null or phone ~ '^[+][1-9][0-9]{7,14}$')
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_exam_term_id_exam_terms_id_fk" FOREIGN KEY ("exam_term_id") REFERENCES "public"."exam_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_subject_id_class_subjects_id_fk" FOREIGN KEY ("class_subject_id") REFERENCES "public"."class_subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_assessment_type_id_assessment_types_id_fk" FOREIGN KEY ("assessment_type_id") REFERENCES "public"."assessment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_mark_sheet_id_mark_sheets_id_fk" FOREIGN KEY ("mark_sheet_id") REFERENCES "public"."mark_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_terms" ADD CONSTRAINT "exam_terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_terms" ADD CONSTRAINT "exam_terms_grading_scale_id_grading_scales_id_fk" FOREIGN KEY ("grading_scale_id") REFERENCES "public"."grading_scales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_boundaries" ADD CONSTRAINT "grade_boundaries_grading_scale_id_grading_scales_id_fk" FOREIGN KEY ("grading_scale_id") REFERENCES "public"."grading_scales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_exam_term_id_exam_terms_id_fk" FOREIGN KEY ("exam_term_id") REFERENCES "public"."exam_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_class_subject_id_class_subjects_id_fk" FOREIGN KEY ("class_subject_id") REFERENCES "public"."class_subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_mark_sheet_id_mark_sheets_id_fk" FOREIGN KEY ("mark_sheet_id") REFERENCES "public"."mark_sheets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_approvals" ADD CONSTRAINT "result_approvals_exam_term_id_exam_terms_id_fk" FOREIGN KEY ("exam_term_id") REFERENCES "public"."exam_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_approvals" ADD CONSTRAINT "result_approvals_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_approvals" ADD CONSTRAINT "result_approvals_class_approved_by_users_id_fk" FOREIGN KEY ("class_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_approvals" ADD CONSTRAINT "result_approvals_final_approved_by_users_id_fk" FOREIGN KEY ("final_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_approvals" ADD CONSTRAINT "result_approvals_reopened_by_users_id_fk" FOREIGN KEY ("reopened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_current_academic_year_id_academic_years_id_fk" FOREIGN KEY ("current_academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_current_exam_term_id_exam_terms_id_fk" FOREIGN KEY ("current_exam_term_id") REFERENCES "public"."exam_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_teacher_id_users_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_remarks" ADD CONSTRAINT "student_remarks_exam_term_id_exam_terms_id_fk" FOREIGN KEY ("exam_term_id") REFERENCES "public"."exam_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_remarks" ADD CONSTRAINT "student_remarks_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_remarks" ADD CONSTRAINT "student_remarks_written_by_users_id_fk" FOREIGN KEY ("written_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_subject_id_class_subjects_id_fk" FOREIGN KEY ("class_subject_id") REFERENCES "public"."class_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_term_cs_idx" ON "assessments" USING btree ("exam_term_id","class_subject_id");--> statement-breakpoint
CREATE INDEX "audit_logs_occurred_idx" ON "audit_logs" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_table_record_idx" ON "audit_logs" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "class_subjects_class_year_idx" ON "class_subjects" USING btree ("class_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_name_unique" ON "classes" USING btree (lower(name));--> statement-breakpoint
CREATE INDEX "correction_requests_sheet_idx" ON "correction_requests" USING btree ("mark_sheet_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "correction_requests_one_open" ON "correction_requests" USING btree ("mark_sheet_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "enrollments_section_idx" ON "enrollments" USING btree ("section_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "grading_scales_one_default" ON "grading_scales" USING btree ("is_default") WHERE is_default;--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email_key","attempted_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip_address","attempted_at");--> statement-breakpoint
CREATE INDEX "mark_sheets_section_term_idx" ON "mark_sheets" USING btree ("section_id","exam_term_id");--> statement-breakpoint
CREATE INDEX "marks_sheet_idx" ON "marks" USING btree ("mark_sheet_id");--> statement-breakpoint
CREATE INDEX "marks_enrollment_idx" ON "marks" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "sections_class_teacher_idx" ON "sections" USING btree ("class_teacher_id");--> statement-breakpoint
CREATE INDEX "sections_year_idx" ON "sections" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "students_code_unique" ON "students" USING btree (lower(student_code));--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_name_unique" ON "subjects" USING btree (lower(name));--> statement-breakpoint
CREATE INDEX "teacher_assignments_teacher_idx" ON "teacher_assignments" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower(email));--> statement-breakpoint
CREATE INDEX "users_role_active_idx" ON "users" USING btree (role,is_active);
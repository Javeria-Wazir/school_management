CREATE TYPE "public"."result_stage" AS ENUM('monthly', 'term');--> statement-breakpoint
ALTER TABLE "mark_sheets" DROP CONSTRAINT "mark_sheets_unique";--> statement-breakpoint
ALTER TABLE "result_approvals" DROP CONSTRAINT "result_approvals_unique";--> statement-breakpoint
ALTER TABLE "student_remarks" DROP CONSTRAINT "student_remarks_unique";--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD COLUMN "stage" "result_stage" DEFAULT 'term' NOT NULL;--> statement-breakpoint
ALTER TABLE "result_approvals" ADD COLUMN "stage" "result_stage" DEFAULT 'term' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_remarks" ADD COLUMN "stage" "result_stage" DEFAULT 'term' NOT NULL;--> statement-breakpoint
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_stage_unique" UNIQUE("exam_term_id","section_id","class_subject_id","stage");--> statement-breakpoint
ALTER TABLE "result_approvals" ADD CONSTRAINT "result_approvals_stage_unique" UNIQUE("exam_term_id","section_id","stage");--> statement-breakpoint
ALTER TABLE "student_remarks" ADD CONSTRAINT "student_remarks_stage_unique" UNIQUE("exam_term_id","enrollment_id","stage");
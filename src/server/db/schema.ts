/**
 * Database schema (Drizzle). `npm run db:generate` turns changes here into SQL migrations in
 * `drizzle/`. Triggers, functions and seed rows that Drizzle cannot express live in hand-written
 * migrations in the same folder (see drizzle/0001_*.sql).
 *
 * Conventions: snake_case columns, uuid primary keys, `numeric` for marks (read as strings and
 * computed with decimal.js), CHECK constraints for every invariant that fits in one row.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "teacher"]);
export const studentStatus = pgEnum("student_status", ["active", "archived", "transferred", "graduated"]);
export const enrollmentStatus = pgEnum("enrollment_status", ["active", "withdrawn"]);
export const markSheetStatus = pgEnum("mark_sheet_status", ["draft", "submitted", "under_review", "approved", "returned"]);
export const correctionStatus = pgEnum("correction_status", ["open", "accepted", "rejected"]);
export const resultStatus = pgEnum("result_status", ["open", "class_approved", "final_approved"]);
/**
 * A term is published in two stages. `monthly`: the Monthly Test component alone (its own mark sheets,
 * result and cards). `term`: for mark sheets, the remaining components (Term Examination …); for
 * results and remarks, the full term result built from both stages.
 */
export const resultStage = pgEnum("result_stage", ["monthly", "term"]);

export type UserRole = (typeof userRole.enumValues)[number];
export type MarkSheetStatus = (typeof markSheetStatus.enumValues)[number];
export type ResultApprovalStatus = (typeof resultStatus.enumValues)[number];
export type ResultStage = (typeof resultStage.enumValues)[number];

const tz = { withTimezone: true } as const;
const createdAt = () => timestamp("created_at", tz).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", tz).notNull().defaultNow();

// -- staff accounts and sessions ------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    role: userRole("role").notNull().default("teacher"),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    passwordHash: text("password_hash").notNull(),
    passwordChangedAt: timestamp("password_changed_at", tz),
    lastLoginAt: timestamp("last_login_at", tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [
    uniqueIndex("users_email_unique").on(sql`lower(email)`),
    check("users_email_format", sql`email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' and length(email) <= 254`),
    check("users_full_name_length", sql`length(trim(full_name)) between 1 and 120`),
    check("users_phone_format", sql`phone is null or phone ~ '^[+][1-9][0-9]{7,14}$'`),
    index("users_role_active_idx").on(sql`role`, sql`is_active`),
  ],
);

/** `id` is the SHA-256 hex digest of the cookie token; the token itself is never stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", tz).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", tz).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    emailKey: text("email_key").notNull(),
    ipAddress: text("ip_address"),
    success: boolean("success").notNull(),
    attemptedAt: timestamp("attempted_at", tz).notNull().defaultNow(),
  },
  (t) => [
    index("login_attempts_email_idx").on(t.emailKey, t.attemptedAt),
    index("login_attempts_ip_idx").on(t.ipAddress, t.attemptedAt),
  ],
);

// -- academic structure ---------------------------------------------------------------------------

export const academicYears = pgTable(
  "academic_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique("academic_years_name_unique"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [
    check("academic_years_name_format", sql`name ~ '^[0-9]{4}-[0-9]{4}$'`),
    check("academic_years_dates", sql`end_date > start_date`),
  ],
);

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [
    uniqueIndex("classes_name_unique").on(sql`lower(name)`),
    check("classes_name_length", sql`length(trim(name)) between 1 and 50`),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "restrict" }),
    academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    classTeacherId: uuid("class_teacher_id").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("sections_class_year_name_unique").on(t.classId, t.academicYearId, t.name),
    index("sections_class_teacher_idx").on(t.classTeacherId),
    index("sections_year_idx").on(t.academicYearId),
    check("sections_name_length", sql`length(trim(name)) between 1 and 20`),
  ],
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    code: text("code").notNull().unique("subjects_code_unique"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [
    uniqueIndex("subjects_name_unique").on(sql`lower(name)`),
    check("subjects_name_length", sql`length(trim(name)) between 1 and 60`),
    check("subjects_code_format", sql`code ~ '^[A-Z0-9_-]{1,12}$'`),
  ],
);

/** Which subjects a class studies in a given academic year. */
export const classSubjects = pgTable(
  "class_subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "restrict" }),
    academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    /** Must be passed for an overall pass (if the grading scale requires it). */
    isCompulsory: boolean("is_compulsory").notNull().default(true),
    /** Counts towards the grand total and overall percentage. */
    includeInTotal: boolean("include_in_total").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("class_subjects_unique").on(t.classId, t.academicYearId, t.subjectId),
    index("class_subjects_class_year_idx").on(t.classId, t.academicYearId),
  ],
);

// -- students and enrolments ----------------------------------------------------------------------

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentCode: text("student_code").notNull(),
    fullName: text("full_name").notNull(),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    dateOfBirth: date("date_of_birth"),
    status: studentStatus("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [
    uniqueIndex("students_code_unique").on(sql`lower(student_code)`),
    check("students_code_format", sql`student_code ~ '^[A-Za-z0-9/_-]{1,30}$'`),
    check("students_full_name_length", sql`length(trim(full_name)) between 1 and 120`),
    check("students_guardian_name_length", sql`guardian_name is null or length(guardian_name) <= 120`),
    check("students_guardian_phone_format", sql`guardian_phone is null or guardian_phone ~ '^[+][1-9][0-9]{7,14}$'`),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "restrict" }),
    academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "restrict" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "restrict" }),
    sectionId: uuid("section_id").notNull().references(() => sections.id, { onDelete: "restrict" }),
    rollNumber: integer("roll_number").notNull(),
    status: enrollmentStatus("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("enrollments_roll_unique").on(t.academicYearId, t.classId, t.rollNumber),
    unique("enrollments_student_year_unique").on(t.studentId, t.academicYearId),
    index("enrollments_section_idx").on(t.sectionId, t.status),
    check("enrollments_roll_range", sql`roll_number between 1 and 99999`),
  ],
);

// -- grading --------------------------------------------------------------------------------------

export const gradingScales = pgTable(
  "grading_scales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique("grading_scales_name_unique"),
    subjectPassPercentage: numeric("subject_pass_percentage", { precision: 5, scale: 2 }).notNull().default("33"),
    overallPassPercentage: numeric("overall_pass_percentage", { precision: 5, scale: 2 }).notNull().default("33"),
    requireAllCompulsoryPass: boolean("require_all_compulsory_pass").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("grading_scales_one_default").on(t.isDefault).where(sql`is_default`),
    check("grading_scales_name_length", sql`length(trim(name)) between 1 and 60`),
    check("grading_scales_subject_pass_range", sql`subject_pass_percentage between 0 and 100`),
    check("grading_scales_overall_pass_range", sql`overall_pass_percentage between 0 and 100`),
  ],
);

export const gradeBoundaries = pgTable(
  "grade_boundaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gradingScaleId: uuid("grading_scale_id").notNull().references(() => gradingScales.id, { onDelete: "cascade" }),
    grade: text("grade").notNull(),
    minPercentage: numeric("min_percentage", { precision: 5, scale: 2 }).notNull(),
    remark: text("remark").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("grade_boundaries_grade_unique").on(t.gradingScaleId, t.grade),
    unique("grade_boundaries_min_unique").on(t.gradingScaleId, t.minPercentage),
    check("grade_boundaries_grade_length", sql`length(trim(grade)) between 1 and 5`),
    check("grade_boundaries_min_range", sql`min_percentage between 0 and 100`),
    check("grade_boundaries_remark_length", sql`length(remark) <= 60`),
  ],
);

// -- exam terms and assessment configuration ------------------------------------------------------

export const examTerms = pgTable(
  "exam_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    startDate: date("start_date"),
    endDate: date("end_date"),
    marksDeadline: date("marks_deadline"),
    /** `null` = the default grading scale. */
    gradingScaleId: uuid("grading_scale_id").references(() => gradingScales.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("exam_terms_year_name_unique").on(t.academicYearId, t.name),
    check("exam_terms_name_length", sql`length(trim(name)) between 1 and 60`),
    check("exam_terms_dates", sql`end_date is null or start_date is null or end_date >= start_date`),
  ],
);

/** Components of a subject's marks, e.g. Monthly Test (25) and Term Examination (75). */
export const assessmentTypes = pgTable(
  "assessment_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique("assessment_types_code_unique"),
    name: text("name").notNull(),
    defaultMaxMarks: numeric("default_max_marks", { precision: 6, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [
    check("assessment_types_code_format", sql`code ~ '^[A-Z0-9_]{1,20}$'`),
    check("assessment_types_name_length", sql`length(trim(name)) between 1 and 60`),
    check("assessment_types_max_range", sql`default_max_marks > 0 and default_max_marks <= 1000`),
  ],
);

/** One row per term × class subject × component, with that combination's maximum marks. */
export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examTermId: uuid("exam_term_id").notNull().references(() => examTerms.id, { onDelete: "restrict" }),
    classSubjectId: uuid("class_subject_id").notNull().references(() => classSubjects.id, { onDelete: "restrict" }),
    assessmentTypeId: uuid("assessment_type_id").notNull().references(() => assessmentTypes.id, { onDelete: "restrict" }),
    maxMarks: numeric("max_marks", { precision: 6, scale: 2 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("assessments_unique").on(t.examTermId, t.classSubjectId, t.assessmentTypeId),
    index("assessments_term_cs_idx").on(t.examTermId, t.classSubjectId),
    check("assessments_max_range", sql`max_marks > 0 and max_marks <= 1000`),
  ],
);

/** Exactly one teacher owns one subject in one section. */
export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    sectionId: uuid("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
    classSubjectId: uuid("class_subject_id").notNull().references(() => classSubjects.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("teacher_assignments_unique").on(t.sectionId, t.classSubjectId),
    index("teacher_assignments_teacher_idx").on(t.teacherId),
  ],
);

// -- mark sheets (workflow unit) and marks --------------------------------------------------------

export const markSheets = pgTable(
  "mark_sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examTermId: uuid("exam_term_id").notNull().references(() => examTerms.id, { onDelete: "restrict" }),
    sectionId: uuid("section_id").notNull().references(() => sections.id, { onDelete: "restrict" }),
    classSubjectId: uuid("class_subject_id").notNull().references(() => classSubjects.id, { onDelete: "restrict" }),
    /** Which components the sheet holds: the Monthly Test, or the other (term) components. */
    stage: resultStage("stage").notNull().default("term"),
    status: markSheetStatus("status").notNull().default("draft"),
    /** Overrides the term's marks deadline when set. */
    deadline: date("deadline"),
    submittedBy: uuid("submitted_by").references(() => users.id),
    submittedAt: timestamp("submitted_at", tz),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", tz),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", tz),
    returnReason: text("return_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("mark_sheets_stage_unique").on(t.examTermId, t.sectionId, t.classSubjectId, t.stage),
    index("mark_sheets_section_term_idx").on(t.sectionId, t.examTermId),
  ],
);

/** `marks_obtained` NULL = not entered (missing). 0 is a real score. */
export const marks = pgTable(
  "marks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    markSheetId: uuid("mark_sheet_id").notNull().references(() => markSheets.id, { onDelete: "restrict" }),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id").notNull().references(() => enrollments.id, { onDelete: "restrict" }),
    marksObtained: numeric("marks_obtained", { precision: 6, scale: 2 }),
    enteredBy: uuid("entered_by").references(() => users.id),
    changeReason: text("change_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("marks_unique").on(t.assessmentId, t.enrollmentId),
    index("marks_sheet_idx").on(t.markSheetId),
    index("marks_enrollment_idx").on(t.enrollmentId),
    check("marks_non_negative", sql`marks_obtained is null or marks_obtained >= 0`),
    check("marks_change_reason_length", sql`change_reason is null or length(change_reason) <= 300`),
  ],
);

// -- corrections, class result approval, remarks --------------------------------------------------

export const correctionRequests = pgTable(
  "correction_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    markSheetId: uuid("mark_sheet_id").notNull().references(() => markSheets.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by").notNull().references(() => users.id),
    reason: text("reason").notNull(),
    status: correctionStatus("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", tz),
    resolutionNote: text("resolution_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("correction_requests_sheet_idx").on(t.markSheetId, t.status),
    uniqueIndex("correction_requests_one_open").on(t.markSheetId).where(sql`status = 'open'`),
    check("correction_requests_reason_length", sql`length(trim(reason)) between 5 and 500`),
    check("correction_requests_note_length", sql`resolution_note is null or length(resolution_note) <= 500`),
  ],
);

export const resultApprovals = pgTable(
  "result_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examTermId: uuid("exam_term_id").notNull().references(() => examTerms.id, { onDelete: "restrict" }),
    sectionId: uuid("section_id").notNull().references(() => sections.id, { onDelete: "restrict" }),
    /** `monthly` = the monthly result; `term` = the full term result (monthly + term components). */
    stage: resultStage("stage").notNull().default("term"),
    status: resultStatus("status").notNull().default("open"),
    classApprovedBy: uuid("class_approved_by").references(() => users.id),
    classApprovedAt: timestamp("class_approved_at", tz),
    finalApprovedBy: uuid("final_approved_by").references(() => users.id),
    finalApprovedAt: timestamp("final_approved_at", tz),
    publishedOn: date("published_on"),
    reopenedBy: uuid("reopened_by").references(() => users.id),
    reopenedAt: timestamp("reopened_at", tz),
    reopenReason: text("reopen_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("result_approvals_stage_unique").on(t.examTermId, t.sectionId, t.stage)],
);

export const studentRemarks = pgTable(
  "student_remarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examTermId: uuid("exam_term_id").notNull().references(() => examTerms.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id").notNull().references(() => enrollments.id, { onDelete: "restrict" }),
    /** Remarks for the monthly result card or the term result card. */
    stage: resultStage("stage").notNull().default("term"),
    remarks: text("remarks").notNull(),
    writtenBy: uuid("written_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("student_remarks_stage_unique").on(t.examTermId, t.enrollmentId, t.stage),
    check("student_remarks_length", sql`length(remarks) <= 500`),
  ],
);

// -- school settings (single row, id = 1) ---------------------------------------------------------

export const schoolSettings = pgTable(
  "school_settings",
  {
    id: smallint("id").primaryKey().default(1),
    schoolName: text("school_name").notNull().default("School Name"),
    address: text("address").notNull().default(""),
    phone: text("phone"),
    email: text("email"),
    /** PNG/JPEG logo as base64 (≤ 500 KB decoded). */
    logoBase64: text("logo_base64"),
    logoMime: text("logo_mime"),
    currentAcademicYearId: uuid("current_academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
    currentExamTermId: uuid("current_exam_term_id").references(() => examTerms.id, { onDelete: "set null" }),
    reportCardTitle: text("report_card_title").notNull().default("Result Card"),
    reportCardFooter: text("report_card_footer").notNull().default(""),
    showSubjectGrades: boolean("show_subject_grades").notNull().default(true),
    showSubjectStatus: boolean("show_subject_status").notNull().default(true),
    showClassPosition: boolean("show_class_position").notNull().default(false),
    allowDecimalMarks: boolean("allow_decimal_marks").notNull().default(false),
    decimalPlaces: smallint("decimal_places").notNull().default(2),
    requirePrincipalApproval: boolean("require_principal_approval").notNull().default(true),
    defaultCountryCode: text("default_country_code").notNull().default("92"),
    updatedAt: updatedAt(),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  () => [
    check("school_settings_singleton", sql`id = 1`),
    check("school_settings_name_length", sql`length(trim(school_name)) between 2 and 150`),
    check("school_settings_address_length", sql`length(address) <= 300`),
    check("school_settings_phone_format", sql`phone is null or phone ~ '^[+][1-9][0-9]{7,14}$'`),
    check("school_settings_email_format", sql`email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'`),
    check("school_settings_logo_size", sql`logo_base64 is null or length(logo_base64) <= 700000`),
    check("school_settings_logo_mime", sql`logo_mime is null or logo_mime in ('image/png', 'image/jpeg')`),
    check("school_settings_logo_pair", sql`(logo_base64 is null) = (logo_mime is null)`),
    check("school_settings_title_length", sql`length(report_card_title) between 1 and 80`),
    check("school_settings_footer_length", sql`length(report_card_footer) <= 300`),
    check("school_settings_decimal_places", sql`decimal_places between 0 and 2`),
    check("school_settings_country_code", sql`default_country_code ~ '^[1-9][0-9]{0,3}$'`),
  ],
);

// -- audit log (append-only; written by triggers and workflow events) -----------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp("occurred_at", tz).notNull().defaultNow(),
    /** No foreign key on purpose: the trail must outlive any row it mentions. */
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    tableName: text("table_name").notNull(),
    recordId: text("record_id"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    reason: text("reason"),
  },
  (t) => [
    index("audit_logs_occurred_idx").on(t.occurredAt.desc()),
    index("audit_logs_table_record_idx").on(t.tableName, t.recordId),
    index("audit_logs_actor_idx").on(t.actorId),
  ],
);

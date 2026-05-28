# Refine and Professionalize Legal Document Engine

This plan addresses the massive architectural overhaul required to turn the current documentation system into an enterprise-grade, fully data-driven, and institutional-level property transaction infrastructure.

## User Review Required
> [!IMPORTANT]
> **Permanent Deletion Architecture**
> I propose implementing a **Hard Deletion for Storage + Soft Deletion for Database Audit** system:
> 1. When an investor deletes a document, the actual PDF/Snapshot file in the storage bucket is *permanently* destroyed to fulfill data privacy rights.
> 2. The database record is marked as `status = 'deleted'`, removing it from all investor interfaces.
> 3. Admins retain an audit log of *what* was deleted and *when* (and by whom), but they cannot recover the actual file contents. 
> Does this approach align with your legal and compliance expectations?

## Proposed Changes

---

### Phase 1: Database & SQL Refinement (Lifecycle & Synchronization)
Enhance the existing tracking structures to support deletion workflows and advanced metadata synchronization.

#### [NEW] `supabase/migrations/20260528040000_document_lifecycle_management.sql`
- Add a new status `deleted` to the `document_status` enum (or `user_documents.status`).
- Create `user_document_audit_logs` table to track deletions (user_id, document_id, action='DELETED', timestamp).
- Update the `create_automated_document` RPC to inject complex advanced Legal Metadata into the JSON `metadata` field (e.g. `jurisdiction`, `blockchain_tx_hash`, `timestamp_utc`).

---

### Phase 2: Document Template Intelligence (Data & Conditionals)
Refine the actual HTML payloads inside the database to behave intelligently.

#### [MODIFY] `supabase/migrations/20260527184500_legal_document_generation_system.sql`
*(Will be applied via a new migration or RPC update to rewrite templates)*
- Update all 18+ templates to use Handlebars-style or strict regex-based conditional rendering (e.g. wrapping the Outstanding Balance section so the backend RPC strips it if the balance is 0).
- Deepen the typography styling to use strict legal standard margins, Times New Roman/Serif combinations, and institutional formatting.
- Redesign the Legal Metadata footer to include full tracking info.
- Improve the Signature & Seal grid to support dynamic overlaps and witness sections.

---

### Phase 3: Backend Generation Engine Updates
Modify the core generator to process conditional logic.

#### [MODIFY] `supabase/migrations/20260528033000_automated_document_properties.sql`
- Update the `create_automated_document` RPC:
  - Add logic to strip out specific HTML sections if variables evaluate to zero/null (e.g., removing the installment table if `amount_paid >= purchase_amount`).
  - Compute and map the new Legal Metadata objects.

---

### Phase 4: Investor Document Management System (Frontend UI)
Build the user-facing management suite.

#### [MODIFY] `src/components/dashboard/DocumentsPanel.tsx`
- Build a robust search and filtering UI (by property, type, date).
- Implement the document lifecycle actions: 
  - Preview / Print (PDF)
  - Resend to Email
- Implement **Secure Deletion**:
  - Add a high-friction confirmation modal ("This action will permanently remove this document...").
  - Wire the deletion to a backend endpoint that purges storage and updates status.

---

### Phase 5: Admin Audit & Control (Frontend UI)
Build the admin oversight tools.

#### [MODIFY] `src/pages/admin/AdminDocuments.tsx`
- Add a dedicated "Audit Logs" or "Deleted Documents" view in the Admin Document Center.
- Ensure admins can track the lifecycle of every generated document even after investor deletion.

---

## Verification Plan

### Automated/Backend Tests
- Generate a document for a fully paid property and verify that the "Outstanding Balance" section is entirely stripped from the snapshot.
- Execute a deletion as an investor and verify the Storage Bucket object is physically removed, but the audit log retains the deletion event.

### Manual Verification
- Render the documents in the browser and use `window.print()` to verify that A4 PDF formatting scales flawlessly without page cutoffs.
- Verify the mobile responsiveness of the Investor Document Management table.


# Warm & Trustworthy Real Estate Agency Platform

A centralized, agency-curated real estate platform where visitors browse Buy / Rent / Land listings, save favorites, contact assigned agents, and book inspections. Admins manage everything; agents handle their assigned listings, inquiries, and bookings.

> Stack note: built on Lovable's React + Vite + Tailwind frontend with Lovable Cloud (Supabase: Postgres, Auth, Storage) for the backend. Maps are skipped in v1 (address shown as text). Next.js / Vercel / Zustand from the original spec are replaced by the equivalent Lovable defaults (React Router + React Query). Functionality is unchanged.

---

## 🎨 Design direction — Warm & Trustworthy

- **Palette**: warm sand background, deep terracotta primary, forest-green accent, charcoal text, soft cream cards.
- **Typography**: a friendly serif for headings (e.g. Fraunces / Playfair), clean sans-serif for body (Inter).
- **Feel**: generous whitespace, large rounded property imagery, subtle shadows, no harsh borders. Mobile-first. Premium but approachable — local, human, trustworthy.
- All colors defined as HSL design tokens in `index.css` + `tailwind.config.ts` (no hard-coded colors in components).

---

## 👥 Roles & Permissions

1. **Public visitor** — browse, search, filter, view property detail, contact agent (basic form, no login required).
2. **Registered user** — everything above + save properties, book inspections, view inquiry history, manage profile.
3. **Agent** — login, see assigned listings, respond to inquiries, manage their bookings.
4. **Admin** — full CRUD on properties, agents, locations; assign agents; manage all bookings & inquiries; set property status.

Roles stored in a dedicated `user_roles` table with a `has_role()` security-definer function (never on the profile row) — used by all RLS policies.

---

## 🧱 Core pages & flows

### 1. Homepage
- Hero with headline + integrated search bar (location, property type, price range).
- Featured properties strip (admin-curated).
- Three category tiles: **Buy / Rent / Land**.
- Popular locations grid.
- "Why trust us" section (verification, curated listings, real agents).
- Featured agents row with photo, name, # of listings, contact.
- Footer with company info & quick links.

### 2. Listings page (`/properties`)
- Filter sidebar: location, price range slider, property type, bedrooms (when applicable), land size (when type = land), status.
- Sort: newest, price ↑, price ↓, featured.
- Responsive property card grid: hero image, price, short title, location, bedrooms/size badge, "View details".
- URL-synced filters (shareable links), pagination or infinite scroll.

### 3. Property detail page (`/properties/:id`)
- Image gallery with thumbnails + lightbox.
- Optional video walkthrough (embedded if URL provided).
- Title, price, status badge (Available / Reserved / Sold).
- Full description + specs (size, bedrooms, bathrooms, features list).
- Address shown as text (maps deferred).
- **Agent panel**: photo, name, role, Call button, WhatsApp button, "Send inquiry" form, "Book inspection" button.
- Sticky action bar on mobile: Save, Contact, Book.
- Related properties at the bottom.

### 4. Auth (`/auth`)
- Email/password signup + login (Lovable Cloud auth).
- Auto-create profile row on signup via DB trigger.
- Reset password flow with `/reset-password` page.

### 5. User dashboard (`/dashboard`)
- Saved properties grid.
- My inquiries (status, agent, last reply).
- My inspection bookings (date, property, agent, status).
- Profile editor (name, phone, avatar).

### 6. Agent dashboard (`/agent`)
- KPI tiles: assigned listings, open inquiries, upcoming inspections.
- Assigned listings table (quick status update).
- Inquiries inbox (mark replied, add notes).
- Bookings calendar/list (confirm, reschedule, complete).

### 7. Admin panel (`/admin`)
- **Properties**: full CRUD, image uploads to Storage, video URL, assign agent, set status, mark featured.
- **Agents**: invite/create agent accounts, edit profile, view performance (listings, inquiries, conversion).
- **Locations**: manage the curated location list used by filters & homepage.
- **Bookings**: all inspection requests, assign/reassign agent, update status.
- **Inquiries**: all messages, assign to agent, mark resolved.
- **Users**: list registered users, assign roles.

---

## 🗄️ Data model (Lovable Cloud / Postgres)

- `profiles` — id (→ auth.users), full_name, phone, avatar_url
- `user_roles` — user_id, role (`admin` | `agent` | `user`)
- `agents` — id, user_id, bio, photo_url, phone, whatsapp, email, featured
- `locations` — id, name, slug, image_url, featured
- `properties` — id, title, slug, description, price, currency, location_id, address, property_type (`buy`|`rent`|`land`), status (`available`|`reserved`|`sold`), bedrooms, bathrooms, size_sqm, features (jsonb), video_url, agent_id, featured, created_at
- `property_images` — id, property_id, url, sort_order, is_cover
- `saved_properties` — user_id, property_id, created_at
- `inquiries` — id, property_id, user_id (nullable for guests), name, email, phone, message, status, agent_id, created_at
- `bookings` — id, property_id, user_id (nullable for guests), name, email, phone, preferred_date, notes, status (`pending`|`confirmed`|`completed`|`cancelled`), agent_id, created_at

Storage bucket `property-media` (public) for images & optional video thumbs.

RLS on every table: public read for `properties`, `property_images`, `agents`, `locations`; owner-scoped read/write for `saved_properties`, user's own `inquiries`/`bookings`; agent access scoped via `agent_id`; admin full access via `has_role(auth.uid(),'admin')`.

---

## 🚀 Build phases (delivered in this build)

**Phase 1 — Foundation & MVP**
- Design system (warm palette, typography, tokens)
- Database schema + RLS + seed locations & sample properties
- Homepage, Listings, Property Detail
- Admin: property CRUD with image uploads

**Phase 2 — People & engagement**
- Auth (signup/login/reset) + roles
- Agents module + assignment
- Inquiries (guest + logged-in)
- Inspection bookings
- User dashboard
- Agent dashboard
- Admin: agents, bookings, inquiries, users management

**Phase 3 — Polish & performance**
- Lazy-loaded images, skeleton loaders, optimized queries
- URL-synced filters, shareable searches
- Inquiry/booking email-style toasts + agent notifications in dashboard
- Empty states, 404s, loading + error boundaries
- Responsive QA on mobile/tablet/desktop

---

## ✅ What you get at the end

A production-ready, agency-managed real estate site with curated Buy/Rent/Land listings, a strong agent-to-user contact layer, full admin control, and a warm, trustworthy visual identity — ready to publish from Lovable.

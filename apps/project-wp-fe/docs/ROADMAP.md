# WhatsApp SaaS Platform - Project Roadmap

## Overview

A WhatsApp Business API platform for managing customer communications, marketing campaigns, and automated workflows.

---

## Current Sprint: Outbound Marketing

### Completed
- [x] Templates list page with sync functionality
- [x] Template creation form with preview
- [x] Template sync from Meta API

---

## Feature Roadmap

### Phase 1: Foundation (Current)

#### ✅ Completed
- [x] Authentication (sign-in/sign-up with Better Auth)
- [x] Organization management & onboarding
- [x] WhatsApp Business Account connection (Facebook Embedded Signup)
- [x] Dashboard with stats overview
- [x] Database schema for all entities
- [x] App layout with sidebar navigation

#### ✅ Completed
- [x] **Contacts** - Contact management system
  - List view with search & pagination
  - Create/edit contacts
  - Tag management
  - Contact detail page

### Phase 2: Outbound Marketing

#### ✅ Completed
- [x] **Templates** - WhatsApp message templates
  - List approved/pending templates
  - Sync templates from Meta
  - Create new templates (submit to Meta)
  - Template preview
  - Variable management

#### 📋 Planned

- [ ] **Campaigns** - Bulk messaging
  - Campaign creation wizard
  - Audience selection (by tags)
  - Template selection
  - Schedule campaigns
  - Campaign analytics (sent/delivered/read/failed)

### Phase 3: Inbound & Conversations

#### 📋 Planned
- [ ] **Conversations** - Messaging inbox
  - Real-time message display
  - Reply to customers
  - Conversation assignment
  - Quick replies
  - Media support (images, documents, etc.)

### Phase 4: Automation

#### 📋 Planned
- [ ] **Flows** - Automated workflows
  - Visual flow builder
  - Trigger conditions
  - Auto-responses
  - Flow analytics

### Phase 5: Settings & Admin

#### 📋 Planned
- [ ] **Settings**
  - Organization settings
  - WhatsApp number management
  - Team member management
  - Webhook configuration
  - API keys

---

## Technical Stack

- **Frontend**: React + TanStack Router + TanStack Query
- **Backend**: TanStack Start (SSR) + Server Functions
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth
- **UI**: shadcn/ui + Tailwind CSS
- **WhatsApp**: Meta Cloud API + Embedded Signup

---

## Database Schema

| Table | Description |
|-------|-------------|
| `whatsapp_business_accounts` | Connected WABA accounts |
| `phone_numbers` | WhatsApp phone numbers |
| `contacts` | Customer contacts |
| `contact_tags` | Tags for organizing contacts |
| `conversations` | Chat threads |
| `messages` | Individual messages |
| `message_templates` | Approved WhatsApp templates |
| `campaigns` | Marketing campaigns |
| `campaign_recipients` | Campaign target contacts |
| `flows` | Automation workflows |
| `flow_responses` | Flow completion data |

---

## Changelog

### 2024-12-11
- ✅ Completed Templates page implementation
  - Server functions for templates CRUD operations (`src/server/templates.ts`)
  - Templates list with search and pagination
  - Sync templates from Meta API (Graph API integration)
  - Create template form with real-time preview
  - Support for headers, body, footer, and buttons
  - Template submission to Meta for approval
- Added UI components: textarea
- Templates page at `/app/templates` with create page at `/app/templates/create`

### 2024-12-08
- ✅ Completed Contacts page implementation
  - Server functions for CRUD operations (`src/server/contacts.ts`)
  - Contacts list with DataTable, search, and pagination
  - Create contact dialog with validation
  - Contact detail page with edit functionality
  - Tag management system (create, assign, remove tags)
- Added UI components: table, dropdown-menu, badge, select, checkbox
- Created project roadmap documentation

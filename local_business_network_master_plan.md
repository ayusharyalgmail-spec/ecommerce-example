# Local Business Network — Business & Product Master Plan

## 1. Vision

I want to build a local-business digital network that starts in my own area and can eventually expand into neighboring areas.

The basic idea is:

- Buy a geographic/local domain such as `dumarwana.com` after validating the idea.
- Build a polished example business website under that domain.
- Use the example as a live sales/demo product for local businesses.
- When a business agrees, give it its own website/subdomain, for example:
  - `shop.dumarwana.com`
  - `hotel.dumarwana.com`
  - `workshop.dumarwana.com`
- Eventually support the customer's own custom domain, such as `myshop.com`, pointing to the same platform.
- Build the underlying system once and reuse it for many businesses instead of creating every website as a separate codebase.
- Once the model works in one area, replicate it in nearby areas with domains such as `simara.com`, while using the same underlying platform.

The long-term goal is not simply to make websites. The goal is to operate a reusable **local-business web platform/network**.

---

# 2. Core Business Principle

Do not sell:

> "I make websites."

Sell:

> "I can put your business online with a professional website and tools that help customers find, contact, browse, book, inquire, or eventually order from you."

The website is the product interface.

The real product is the ongoing digital presence and business infrastructure.

---

# 3. Validation Before Spending

Do not immediately buy many geographic domains.

First validate the idea.

Initial sequence:

1. Continue using `dumarwana.vercel.app`.
2. Build one excellent, realistic demo business.
3. Show it to 10–20 real local businesses.
4. Ask what they actually need.
5. Try to get the first paying customer.
6. Get 3–5 paying customers.
7. Identify the features that repeat across customers.
8. Turn those repeated features into the reusable platform.
9. Only then buy `dumarwana.com`.
10. Expand to another area only after the first area has proven demand.

The first important milestone is NOT:

> "The platform is complete."

It is:

> **"One real business is paying me."**

Then:

> **3 customers → 10 customers → repeatable sales process → expansion.**

---

# 4. Do Not Build Everything First

Avoid starting with:

- full e-commerce
- hotels
- workshops
- restaurants
- inventory
- payment systems
- booking systems
- complex analytics
- every possible business category

This creates a huge development project before proving demand.

Start with a generic local-business website platform.

### V1 should include

- Business profile
- Logo
- Business name
- About section
- Products/services
- Gallery
- Contact information
- Phone buttons
- Social links
- Location/map
- Opening hours
- Inquiry/contact form
- Basic SEO
- Mobile-first design
- Responsive desktop design
- Admin dashboard
- Basic analytics
- Business-specific branding/theme
- Basic content management

Later, add features only when customers actually need them.

### V2 may include

- Orders
- Bookings
- Inventory
- Customer management
- Payments
- Notifications
- Advanced analytics
- Promotions
- Reviews
- Delivery/order status

---

# 5. Multi-Tenant Architecture

Do NOT create completely separate codebases for every business.

Bad approach:

```text
Business A → separate project
Business B → separate project
Business C → separate project
```

Good approach:

```text
                    ┌── Business A
                    │
ONE PLATFORM ───────┼── Business B
                    │
                    ├── Business C
                    │
                    └── Business D
```

The platform should be multi-tenant.

Each business should have its own data/configuration:

```text
business_id
business_name
logo
theme
contact
address
location
opening_hours
products
services
gallery
social_links
domain
settings
```

The same application renders different businesses depending on the hostname.

For example:

```text
shop.dumarwana.com
hotel.dumarwana.com
workshop.dumarwana.com
```

all use the same core platform.

---

# 6. Domain Architecture

Initial model:

```text
dumarwana.com
│
├── business1.dumarwana.com
├── business2.dumarwana.com
├── business3.dumarwana.com
└── ayush.dumarwana.com
```

The main domain can be the local-business network.

Example:

```text
dumarwana.com
```

could contain:

- Local businesses
- Featured businesses
- Categories
- Deals
- Business discovery
- Information about the platform
- "Get your business online" CTA

My personal portfolio can be:

```text
ayush.dumarwana.com
```

or another dedicated portfolio domain.

A customer should feel that:

```text
business1.dumarwana.com
```

is THEIR website, not merely a page inside my portfolio.

My branding should be subtle, for example:

> Powered by [Platform]

or:

> Website by Ayush

---

# 7. Custom Domains

Do not force businesses to stay on the geographic subdomain.

Support:

```text
business.dumarwana.com
```

as the default option.

Later support:

```text
mybusiness.com
```

pointing to the same tenant.

Architecture:

```text
                    ┌── business.dumarwana.com
                    │
ONE BUSINESS ───────┤
                    │
                    └── mybusiness.com
```

This makes the platform more professional and gives customers a path to upgrade.

---

# 8. Geographic Expansion

Do not buy domains for every nearby place before validating demand.

Expansion should look like:

```text
Dumarwana
    ↓
Prove demand
    ↓
3–10+ customers
    ↓
Repeatable sales process
    ↓
Nearby area
    ↓
Simara
    ↓
Other markets
```

Potentially:

```text
dumarwana.com
simara.com
hetauda.com
...
```

All can eventually run on the same underlying platform.

The geographic domains are distribution/marketing assets.

The real business is the platform underneath them.

---

# 9. Business Model

Do not charge only for "updates."

Customers should understand what they are paying for.

Possible model:

### Setup Fee

Charge for:

- initial configuration
- branding
- content setup
- product/service setup
- domain configuration
- launch
- customization

Example range:

```text
NPR 10,000–30,000+
```

depending on complexity and local willingness to pay.

### Recurring Maintenance

Potentially:

```text
NPR 500–2,000/month
```

or an annual plan.

This can include:

- hosting
- maintenance
- backups
- security
- content changes
- support
- technical monitoring
- basic analytics

The exact price must be validated against the local market.

Do not assume the market will accept a particular price.

---

# 10. The Economics

The long-term advantage is recurring revenue.

Illustrative examples only:

```text
50 businesses × NPR 1,000/month
= NPR 50,000/month

100 businesses × NPR 1,000/month
= NPR 100,000/month

500 businesses × NPR 1,000/month
= NPR 500,000/month
```

These are NOT forecasts.

The difficult part is acquiring and retaining those customers.

The real objective is:

> Build a system where adding another business does not require rebuilding the product from scratch.

---

# 11. Sales Strategy

The first sales strategy should be demonstration-based.

Do not simply say:

> "Do you want a website?"

Instead:

> "I made an example of what your business could look like online."

Show a working website.

Let them see:

- their business name
- their products/services
- their location
- their contact details
- mobile experience
- photos
- customer-facing presentation

Then ask:

> "Would something like this be useful for your business?"

The goal of the first conversations is to learn what businesses actually value.

Do not assume that the features I think are useful are the features customers will pay for.

---

# 12. Main Business Risk

The biggest risk is not coding.

The biggest risk is building for months without getting customers.

Potential failure pattern:

```text
Build
↓
Improve animation
↓
Add features
↓
Build dashboard
↓
Build e-commerce
↓
Buy domains
↓
Build another template
↓
Still no customers
```

Avoid this.

Use a customer-first loop:

```text
Build small
↓
Show customers
↓
Get feedback
↓
Sell
↓
Observe repeated needs
↓
Build those needs
↓
Repeat
```

---

# 13. Avoid Developer Tunnel Vision

The platform should not be judged by how technically impressive it is.

A beautiful 3D website does not automatically create business value.

Ask:

- Does it help customers find the business?
- Does it make contacting the business easier?
- Does it make the business look more trustworthy?
- Does it generate inquiries?
- Does it help the owner manage information?
- Does it save the owner time?
- Does it generate measurable value?

If not, the feature may not deserve development time.

---

# 14. Product Roadmap

## Phase 0 — Current Prototype

Use:

```text
dumarwana.vercel.app
```

Build one highly polished demo.

The demo should look like a real customer project, not a generic developer template.

---

## Phase 1 — Validation

Goal:

> Get the first paying customer.

Tasks:

- Build one demo
- Talk to 10–20 businesses
- Demonstrate the product
- Record objections
- Learn what businesses actually want
- Attempt to close the first customer

Do not overbuild.

---

## Phase 2 — First Customers

Goal:

> 3–5 paying businesses.

Identify:

- common requirements
- repeated UI
- repeated backend logic
- common admin features
- common pricing objections
- common support requests

Turn repeated work into reusable functionality.

---

## Phase 3 — Platform

Build:

- multi-tenancy
- business dashboard
- business settings
- theme system
- content management
- product/service management
- media management
- SEO configuration
- analytics
- custom domain support
- subdomain routing
- billing/subscription system

---

## Phase 4 — Geographic Brand

After validation:

```text
dumarwana.com
```

Use it as the local network.

Potential structure:

```text
dumarwana.com
├── Businesses
├── Categories
├── Featured
├── Deals
├── About
└── Create Your Business Website
```

Individual businesses:

```text
business.dumarwana.com
```

---

## Phase 5 — Expansion

After Dumarwana is proven:

```text
simara.com
```

and potentially other local domains.

Do not repeat the development process.

Reuse the platform.

---

# 15. Long-Term Possibility

If the platform grows, the geographic network could evolve beyond websites.

Potential features:

### Business Directory

```text
dumarwana.com/businesses
```

### Deals

```text
dumarwana.com/deals
```

### Local Services

```text
dumarwana.com/services
```

### Booking

```text
business.dumarwana.com/book
```

### Orders

```text
business.dumarwana.com/order
```

### Business Analytics

```text
business.dumarwana.com/admin
```

Potential revenue streams:

- website setup fees
- subscriptions
- premium listings
- featured placement
- advertising
- booking commissions
- lead generation
- business software subscriptions
- premium features

However:

**Do not build this directory/marketplace layer until the basic website business is already working.**

---

# 16. Technical Principles

The platform should be designed for:

- multi-tenancy
- clean separation of business data
- secure authentication
- role-based access
- responsive design
- mobile-first UX
- SEO
- server-side rendering where appropriate
- dynamic metadata
- sitemap generation
- robots.txt
- custom domains
- wildcard subdomains
- tenant-aware routing
- scalable database design
- backups
- monitoring
- logs
- analytics
- reliable deployment
- security
- easy maintenance

Avoid creating a system that only works for the first 2–3 businesses.

---

# 17. Portfolio Strategy

My portfolio can demonstrate the platform's capabilities.

For example:

```text
ayush.dumarwana.com
```

It can contain:

- About me
- Projects
- Client projects
- Technologies
- Business platform
- Case studies
- Contact
- What I build

The portfolio should demonstrate actual work.

The strongest proof will eventually be:

> "Here are 10 real businesses currently using the system."

That is much stronger than a page containing only screenshots.

---

# 18. What Success Actually Looks Like

Do not define success as:

- having many domains
- having a complicated backend
- having hundreds of pages
- having impressive animations
- having many templates

Define success as:

```text
Real businesses
        ↓
Paying customers
        ↓
Recurring revenue
        ↓
Low effort to onboard each new business
        ↓
High customer retention
        ↓
Repeatable sales process
        ↓
Expansion into new areas
```

---

# 19. Brutally Honest Rules

1. Do not build for months without talking to customers.
2. Do not buy many domains before proving demand.
3. Do not build five business categories simultaneously.
4. Do not create a separate codebase for every customer.
5. Do not assume businesses will pay for features just because they look impressive.
6. Do not confuse technical complexity with business value.
7. Do not make the customer feel like they are simply a subpage of my portfolio.
8. Do not force customers to use a geographic subdomain if they want their own domain.
9. Do not promise features that do not exist.
10. Do not fake testimonials, reviews, customer numbers, traffic, or business results.
11. Do not optimize for 500 customers before getting the first customer.
12. Do not expand geographically until the first market has proven the model.
13. Charge for value and ongoing service, not merely for "editing a website."
14. Build reusable infrastructure only after identifying what is genuinely repeated.
15. The first objective is one paying customer.

---

# 20. Immediate Action Plan

### Right now

```text
1. Keep dumarwana.vercel.app
2. Choose ONE business category for the first demo
3. Build one excellent realistic website
4. Make it mobile-first
5. Make it look like a real paid project
6. Add a simple admin/content model
7. Prepare a short sales explanation
8. Show it to 10–20 local businesses
9. Record their objections and requirements
10. Try to close the first customer
```

### Only after validation

```text
11. Buy dumarwana.com
12. Build the multi-tenant platform
13. Move the demo onto the real domain
14. Onboard the first customers
15. Add recurring maintenance
16. Support custom domains
17. Measure retention and revenue
18. Expand only when the process is repeatable
```

---

# Final Strategic Position

The idea should NOT be treated as:

> "I want to make websites for shops around me."

The stronger version is:

> **"I want to build a reusable local-business digital platform, prove it in one area, onboard real businesses, create recurring revenue, and replicate the model into neighboring markets."**

The geographic domains are the front door.

The multi-tenant platform is the engine.

The paying businesses are the proof.

The recurring service is the business model.

The first customer is the validation.

The second geographic market comes only after the first one works.

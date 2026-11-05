-- ============================================================================
-- NORTHFIELD RECRUITMENT & SCHEDULING — MASTER DATABASE SETUP
-- Target: Clean/New Supabase Project
-- Run this complete script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  location           TEXT NOT NULL,
  department         TEXT NOT NULL,
  employment_type    TEXT NOT NULL DEFAULT 'Full Time'
                      CHECK (employment_type IN ('Full Time', 'Part Time', 'Contract', 'Internship')),
  short_description  TEXT NOT NULL DEFAULT '',
  description        TEXT NOT NULL DEFAULT '',
  responsibilities   TEXT[] NOT NULL DEFAULT '{}',
  requirements       TEXT[] NOT NULL DEFAULT '{}',
  benefits           TEXT[] NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'published'
                      CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_status_idx ON public.jobs (status);
CREATE INDEX IF NOT EXISTS jobs_slug_idx ON public.jobs (slug);

-- ============================================================================
-- 2. SETTINGS TABLE (Scheduling Availability & Recruiter Profile)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id                     INT PRIMARY KEY DEFAULT 1,
  working_days           INT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sun .. 6=Sat
  day_start_time         TIME NOT NULL DEFAULT '09:00',
  day_end_time           TIME NOT NULL DEFAULT '17:00',
  slot_duration_mins     INT NOT NULL DEFAULT 30,
  timezone               TEXT NOT NULL DEFAULT 'America/New_York',
  interviewer_name       TEXT NOT NULL DEFAULT 'Sarah Jenkins',
  interviewer_photo_url  TEXT,
  meeting_type           TEXT NOT NULL DEFAULT 'Phone Call',
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);

-- Insert default settings row
INSERT INTO public.settings (
  id,
  working_days,
  day_start_time,
  day_end_time,
  slot_duration_mins,
  timezone,
  interviewer_name,
  interviewer_photo_url,
  meeting_type
) VALUES (
  1,
  '{1,2,3,4,5}',
  '09:00',
  '17:00',
  30,
  'America/New_York',
  'Sarah Jenkins',
  NULL,
  'Phone Call'
)
ON CONFLICT (id) DO UPDATE SET
  timezone = 'America/New_York',
  interviewer_name = 'Sarah Jenkins';

-- ============================================================================
-- 3. BOOKINGS TABLE (Interview Reservations & Verification Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID REFERENCES public.jobs (id) ON DELETE SET NULL,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL,
  phone_number     TEXT,
  notes            TEXT,
  date             DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  timezone         TEXT NOT NULL DEFAULT 'America/New_York',
  candidate_id     TEXT,
  passkey          TEXT,
  additional_code  TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('draft', 'pending', 'awaiting_code', 'confirmed', 'rejected', 'cancelled')),
  rejection_reason TEXT,
  session_id       TEXT,
  is_visit         BOOLEAN DEFAULT FALSE,
  ip_address       TEXT,
  city             TEXT,
  state            TEXT,
  country          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_date_idx ON public.bookings (date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);
CREATE INDEX IF NOT EXISTS bookings_session_idx ON public.bookings (session_id);

-- ============================================================================
-- 4. ADMIN LINKS TABLE (Team Link Directory & Duplicate Detection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  company    TEXT NOT NULL,
  link       TEXT NOT NULL,
  agent      TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_links_link ON public.admin_links (link);
CREATE INDEX IF NOT EXISTS idx_admin_links_agent ON public.admin_links (agent);

-- ============================================================================
-- 5. JOB APPLICATIONS TABLE (CV Uploads & Executive Search Submissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  job_slug         TEXT,
  job_title        TEXT NOT NULL,
  first_name       TEXT NOT NULL,
  last_name        TEXT,
  email            TEXT NOT NULL,
  phone_number     TEXT,
  linkedin_url     TEXT,
  portfolio_url    TEXT,
  resume_filename  TEXT,
  resume_file_data TEXT,
  cover_note       TEXT,
  status           TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'invited', 'rejected', 'hired')),
  ip_address       TEXT,
  city             TEXT,
  state            TEXT,
  country          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_email ON public.job_applications (email);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications (status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON public.job_applications (created_at DESC);

-- ============================================================================
-- 6. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_set_updated_at ON public.jobs;
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS settings_set_updated_at ON public.settings;
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS admin_links_set_updated_at ON public.admin_links;
CREATE TRIGGER admin_links_set_updated_at BEFORE UPDATE ON public.admin_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS job_applications_set_updated_at ON public.job_applications;
CREATE TRIGGER job_applications_set_updated_at BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. VIEWS FOR PUBLIC SCHEDULING (Data Privacy)
-- ============================================================================
CREATE OR REPLACE VIEW public.public_booking_slots AS
  SELECT date, start_time, end_time, timezone
  FROM public.bookings
  WHERE status IN ('pending', 'awaiting_code', 'confirmed');

CREATE OR REPLACE VIEW public.public_booking_status AS
  SELECT id, status, updated_at
  FROM public.bookings;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Jobs policies
DROP POLICY IF EXISTS "Public can view published jobs" ON public.jobs;
CREATE POLICY "Public can view published jobs"
  ON public.jobs FOR SELECT
  USING (status = 'published' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
CREATE POLICY "Admins can manage jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Settings policies
DROP POLICY IF EXISTS "Public can view settings" ON public.settings;
CREATE POLICY "Public can view settings"
  ON public.settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
CREATE POLICY "Admins can update settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Bookings policies
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;
CREATE POLICY "Public can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update own booking" ON public.bookings;
CREATE POLICY "Public can update own booking"
  ON public.bookings FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read bookings" ON public.bookings;
CREATE POLICY "Public can read bookings"
  ON public.bookings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "Admins can manage bookings"
  ON public.bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admin links policies
DROP POLICY IF EXISTS "Admins can view admin_links" ON public.admin_links;
CREATE POLICY "Admins can view admin_links"
  ON public.admin_links FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert admin_links" ON public.admin_links;
CREATE POLICY "Admins can insert admin_links"
  ON public.admin_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update admin_links" ON public.admin_links;
CREATE POLICY "Admins can update admin_links"
  ON public.admin_links FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete admin_links" ON public.admin_links;
CREATE POLICY "Admins can delete admin_links"
  ON public.admin_links FOR DELETE
  TO authenticated
  USING (true);

-- Job applications policies
DROP POLICY IF EXISTS "Allow public inserts on job_applications" ON public.job_applications;
CREATE POLICY "Allow public inserts on job_applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read job_applications" ON public.job_applications;
CREATE POLICY "Allow authenticated read job_applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update job_applications" ON public.job_applications;
CREATE POLICY "Admins can update job_applications"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. REALTIME REPLICATION (Instant Admin Dashboard Updates)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_links'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_links;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'job_applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;
  END IF;
END $$;

-- ============================================================================
-- 10. INSERT ALL 12 PUBLISHED USA JOBS (High-Caliber US Market Compensation)
-- ============================================================================
INSERT INTO public.jobs (
  title,
  slug,
  location,
  department,
  employment_type,
  short_description,
  description,
  responsibilities,
  requirements,
  benefits,
  status
)
VALUES
(
  'Lead Social Media Strategist & Content Producer',
  'lead-social-media-strategist',
  'New York, NY (Hybrid / Remote - US)',
  'Social Media & Content',
  'Full Time',
  'Lead organic social strategy across TikTok, Instagram, and LinkedIn. Drive viral storytelling and high-engagement content for high-growth US brands.',
  'We are looking for a visionary Lead Social Media Strategist & Content Producer to spearhead social media campaigns and creative storytelling across major digital channels.

In this role, you will define channel strategy, oversee creative production, analyze community engagement trends, and collaborate directly with our marketing and design teams to build an authentic brand presence that commands attention.',
  ARRAY[
    'Architect and execute end-to-end social media growth strategies across TikTok, Instagram, LinkedIn, and YouTube Shorts',
    'Direct weekly content calendars, short-form video shoots, visual aesthetics, and copy tone-of-voice',
    'Analyze weekly growth KPIs, engagement metrics, and audience sentiment to optimize distribution tactics',
    'Collaborate with executive leadership and brand partners on high-impact product launches and creator collaborations'
  ],
  ARRAY[
    '4+ years of proven track record leading organic social media growth for consumer or tech brands in the US market',
    'Demonstrated ability to produce high-performing TikTok & Reels content with authentic storytelling',
    'Exceptional copywriting skills and eye for modern visual design and typography',
    'Deep understanding of social algorithms, viral hooks, community management, and analytics'
  ],
  ARRAY[
    'Top-tier compensation: $105,000 – $135,000 / year + Annual Performance Bonus (25% above market average)',
    'Comprehensive medical, dental, and vision insurance with 100% premium coverage',
    '401(k) retirement plan with 5% dollar-for-dollar company match',
    '$3,500 annual professional development and content creation equipment stipend',
    'Flexible hybrid / remote arrangement with unlimited paid time off (PTO)'
  ],
  'published'
),
(
  'Senior Performance Marketing Manager (Paid Media)',
  'senior-performance-marketing-manager',
  'Austin, TX (Remote - US)',
  'Marketing & Growth',
  'Full Time',
  'Manage and optimize multi-million dollar ad budgets across Meta Ads, Google Ads, and TikTok with strict focus on ROAS and scalable CAC.',
  'Northfield is seeking an analytical, high-agency Senior Performance Marketing Manager to lead paid customer acquisition and conversion rate optimization.

You will manage significant monthly ad spend across Meta Ads Manager, Google Performance Max/Search, TikTok Ads, and emerging channels, executing data-driven experiments to maximize ROI and customer lifetime value.',
  ARRAY[
    'Own, scale, and optimize paid acquisition budgets across Meta, Google Search/YouTube, TikTok, and Programmatic',
    'Develop rapid creative testing frameworks and collaborate with the design team to produce high-converting ad variations',
    'Manage attribution modeling, pixel tracking, server-side CAPI setups, and full-funnel reporting dashboards',
    'Conduct continuous A/B tests on landing pages to systematically increase conversion rates and reduce CAC'
  ],
  ARRAY[
    '5+ years of hands-on paid media experience managing at least $250k+/month in direct advertising spend',
    'Advanced mastery of Meta Ads Manager, Google Ads, GA4, and multi-touch attribution tools',
    'Strong analytical mindset with deep fluency in cohort analysis, LTV:CAC ratios, and payback periods',
    'Experience scaling US direct-to-consumer (DTC) or high-growth SaaS offerings'
  ],
  ARRAY[
    'Top-tier compensation: $145,000 – $175,000 / year + Equity Incentives (30% above US market median)',
    'Premium health, dental, and vision coverage for you and your dependents',
    '401(k) matching up to 5% with immediate vesting',
    'Work from anywhere in the US with home office setup reimbursement ($2,000)',
    'Generous parental leave and wellness allowance'
  ],
  'published'
),
(
  'Senior Graphic & Brand Identity Designer',
  'senior-graphic-brand-designer',
  'New York, NY (Hybrid / Remote - US)',
  'Design & Creative',
  'Full Time',
  'Craft iconic visual identities, campaign art direction, typography systems, and modern packaging for leading American brands.',
  'We are looking for an exceptional Senior Graphic & Brand Identity Designer to elevate our visual language and lead aesthetic direction across digital, print, and experiential mediums.

You will work closely with creative directors and marketers to conceptualize and craft bespoke visual identities, typography guidelines, marketing assets, and dynamic digital brand experiences.',
  ARRAY[
    'Develop cohesive brand identity systems including logos, color theory, typography hierarchies, and style guides',
    'Design high-impact visual assets for national digital campaigns, social media, outdoor advertising, and pitch collateral',
    'Collaborate with motion designers and web developers to translate static design concepts into interactive digital assets',
    'Ensure uncompromising visual consistency and craftsmanship across all customer touchpoints'
  ],
  ARRAY[
    '5+ years of graphic design and branding experience at a top creative agency or high-growth brand',
    'Outstanding portfolio demonstrating mastery in typography, composition, color palettes, and identity design',
    'Expert-level proficiency in Adobe Creative Cloud (Illustrator, Photoshop, InDesign) and Figma',
    'Strong storytelling ability with the confidence to present and defend creative decisions'
  ],
  ARRAY[
    'Top-tier compensation: $125,000 – $155,000 / year (25% above US industry standard)',
    'Comprehensive medical, dental, and vision insurance with zero employee contribution',
    '401(k) plan with 5% company match',
    'Annual $3,000 creative equipment & design conference allowance',
    'Flexible schedule with remote-friendly culture'
  ],
  'published'
),
(
  'Senior Frontend Web Engineer (React / Next.js)',
  'senior-frontend-engineer',
  'New York, NY (Remote - US)',
  'Engineering & Web',
  'Full Time',
  'Build ultra-fast, responsive web applications and interactive digital products using React, Next.js 14, TypeScript, and Tailwind CSS.',
  'Northfield is looking for a talented Senior Frontend Web Engineer who is passionate about building fluid, performant, and beautifully engineered user interfaces.

You will architect scalable client-side architecture, implement seamless animations, integrate real-time APIs, and deliver state-of-the-art web experiences that delight hundreds of thousands of users.',
  ARRAY[
    'Architect and build high-performance web applications using React 18/19, Next.js App Router, TypeScript, and Tailwind CSS',
    'Implement smooth micro-interactions, responsive design patterns, and accessible (a11y) components',
    'Integrate complex real-time WebSockets, Supabase backends, and third-party APIs with robust error handling',
    'Optimize Core Web Vitals (LCP, FID/INP, CLS) and page rendering speed for maximum conversion performance'
  ],
  ARRAY[
    '5+ years of experience building modern frontend applications with React and TypeScript in production',
    'Deep expertise in Next.js (SSR, SSG, Server Components, API routes, middleware)',
    'Obsessive attention to UI detail, responsive layouts, CSS mastery, and interaction design',
    'Strong understanding of modern web performance, browser APIs, and state management'
  ],
  ARRAY[
    'Top-tier compensation: $165,000 – $205,000 / year + Equity Grants (30% above US market benchmarks)',
    '100% company-paid platinum health, dental, and vision insurance',
    '401(k) with 6% company match',
    '$2,500 home workstation setup stipend + top-of-the-line MacBook Pro M3 Max',
    'Unlimited PTO with mandatory 3-week minimum annual recharge'
  ],
  'published'
),
(
  'Lead UI/UX Product Designer',
  'lead-ui-ux-product-designer',
  'San Francisco, CA (Remote - US)',
  'Design & Creative',
  'Full Time',
  'Design intuitive user journeys, design systems, and complex product interfaces for web and mobile platforms in Figma.',
  'We are hiring a Lead UI/UX Product Designer to shape the product experience for our next generation of digital platforms.

You will bridge the gap between user needs, business goals, and engineering feasibility, taking complex workflows and distilling them into elegant, effortless digital products.',
  ARRAY[
    'Lead end-to-end product design from user research and wireframing to high-fidelity prototypes and developer handoff',
    'Maintain and expand comprehensive Figma design systems, component libraries, and interactive tokens',
    'Conduct qualitative user interviews, usability testing, and metric-driven design iterations',
    'Collaborate seamlessly with frontend engineers to ensure pixel-accurate implementation'
  ],
  ARRAY[
    '5+ years of UI/UX and product design experience for complex web or mobile applications',
    'Mastery of Figma (auto-layout, variables, component variants, advanced prototyping)',
    'Strong portfolio showcasing user-centered problem solving, clean aesthetics, and interactive prototypes',
    'Proven ability to translate user feedback and product analytics into concrete UI improvements'
  ],
  ARRAY[
    'Top-tier compensation: $155,000 – $190,000 / year + Equity (25% above market average)',
    'Full premium medical, dental, and vision insurance coverage',
    '401(k) plan with 5% matching',
    'Remote-first work environment with flexible scheduling across all US time zones',
    'Annual team offsites in premier US destinations'
  ],
  'published'
),
(
  'TikTok & Short-Form Video Producer',
  'tiktok-short-form-video-producer',
  'Los Angeles, CA (Remote - US)',
  'Social Media & Content',
  'Full Time',
  'Script, film, and edit high-performing vertical video content designed for TikTok, Instagram Reels, and YouTube Shorts.',
  'Join Northfield as our TikTok & Short-Form Video Producer. If you live and breathe video trends, understand pacing and hooks, and know how to produce content that stops the scroll, this role is for you.

You will write, shoot, edit, and publish weekly vertical video series that build genuine audience loyalty and massive brand engagement.',
  ARRAY[
    'Conceptualize, script, film, and edit 4–7 engaging short-form videos per week',
    'Stay ahead of viral audio trends, memes, and narrative storytelling formats on TikTok and Instagram',
    'Execute on-camera talent hosting and collaborate with creators and influencers',
    'Analyze video retention curves, completion rates, and conversion metrics to refine hooks and pacing'
  ],
  ARRAY[
    '3+ years creating short-form vertical video content with a demonstrated record of high-engagement or viral videos',
    'Proficiency in Premiere Pro, CapCut, After Effects, and mobile video production gear',
    'Charismatic on-camera presence or exceptional talent direction skills',
    'In-depth knowledge of Gen-Z and millennial digital culture and social trends'
  ],
  ARRAY[
    'Top-tier compensation: $95,000 – $120,000 / year + Creator Performance Bonus (25% above market)',
    'Full medical, dental, and vision health coverage',
    '401(k) retirement plan with 4% company match',
    '$3,000 annual dedicated equipment, lighting, and camera upgrade budget',
    'Flexible schedule and work-from-home freedom'
  ],
  'published'
),
(
  'Director of Growth & Digital Marketing',
  'director-of-growth-digital-marketing',
  'San Francisco, CA (Hybrid / Remote - US)',
  'Marketing & Growth',
  'Full Time',
  'Lead company-wide growth strategy, multichannel acquisition, marketing operations, and brand positioning across the US market.',
  'We are searching for an experienced Director of Growth & Digital Marketing to lead our cross-functional marketing efforts and drive exponential customer acquisition.

You will manage marketing budget allocation, direct our performance marketing, SEO, lifecycle, and brand teams, and report directly to executive leadership on revenue growth.',
  ARRAY[
    'Develop and execute the comprehensive growth roadmap across paid acquisition, organic content, email, and partnerships',
    'Manage and mentor a high-performing marketing team of performance specialists, copywriters, and designers',
    'Own the growth budget, optimizing spend allocation to achieve aggressive revenue targets and maximum ROI',
    'Partner with product and engineering teams to build conversion funnels and automated onboarding loops'
  ],
  ARRAY[
    '7+ years of progressive growth marketing leadership experience in US technology or consumer sectors',
    'Demonstrated history of scaling company revenue from early-stage to high growth ($10M+ ARR / GMV)',
    'Deep analytical skills with mastery in marketing mix modeling, attribution, and growth experimentation',
    'Inspirational leadership style with hands-on technical and strategic capabilities'
  ],
  ARRAY[
    'Top-tier compensation: $185,000 – $225,000 / year + Significant Equity Package (30% above US market)',
    'Executive health insurance package with 100% company coverage',
    '401(k) with 6% employer match',
    'Executive wellness stipend and annual conference budget ($5,000)',
    'Executive remote flexibility and executive retreat privileges'
  ],
  'published'
),
(
  'Creative Web Developer & Webflow/Shopify Specialist',
  'creative-web-developer',
  'Austin, TX (Remote - US)',
  'Engineering & Web',
  'Full Time',
  'Build visually stunning, animation-rich interactive marketing websites and e-commerce experiences with GSAP and Webflow/Shopify.',
  'We are looking for a Creative Web Developer who bridges design sensibility with frontend craft.

You will build show-stopping, highly interactive websites, landing pages, and digital brand experiences featuring custom scroll animations, 3D elements, and clean headless CMS integrations.',
  ARRAY[
    'Build dynamic landing pages and digital experiences with custom JavaScript/TypeScript, GSAP, and Tailwind CSS',
    'Develop custom Webflow and Shopify Plus themes with bespoke interactive modules and CMS structures',
    'Ensure cross-browser compatibility, responsive responsiveness, and blazing fast page speed',
    'Collaborate closely with brand designers to push the boundaries of web interaction and visual polish'
  ],
  ARRAY[
    '3+ years of experience building creative web experiences with HTML/CSS, JavaScript/TypeScript, and GSAP/Framer Motion',
    'Expertise in Webflow development (Client-First style system) or custom Shopify Liquid/Hydrogen',
    'Exceptional eye for animation timing, easing curves, typography, and responsive micro-details',
    'Solid understanding of SEO best practices, Core Web Vitals, and accessibility'
  ],
  ARRAY[
    'Top-tier compensation: $120,000 – $150,000 / year (25% above US market standard)',
    'Comprehensive medical, dental, and vision insurance',
    '401(k) with 5% match',
    '$2,000 home office setup allowance + software subscription stipends',
    'Full remote autonomy across the United States'
  ],
  'published'
),
(
  '3D Motion Graphics & Visual Effects Artist',
  '3d-motion-graphics-artist',
  'Los Angeles, CA (Remote - US)',
  'Design & Creative',
  'Full Time',
  'Create breathtaking 3D animations, product renders, and cinematic promo videos using Cinema 4D/Blender and After Effects.',
  'Northfield is seeking a talented 3D Motion Graphics & Visual Effects Artist to craft cinematic commercial animations, 3D product visualizations, and dynamic motion assets.

You will work with creative directors to produce visual spectacle that sets our brand apart and captures audience imagination.',
  ARRAY[
    'Create high-end 3D product renders, dynamic physics simulations, and abstract brand animations',
    'Produce commercial video ads, title sequences, and social motion graphics using After Effects and Cinema 4D/Blender',
    'Manage lighting, texturing, rendering pipelines (Redshift / Octane), and composite passes',
    'Collaborate with audio designers to sync motion design with impactful sound design'
  ],
  ARRAY[
    '4+ years of professional motion design experience with an outstanding showreel',
    'Mastery of Cinema 4D or Blender with Octane/Redshift rendering, paired with Adobe After Effects',
    'Deep understanding of lighting, texturing, kinetic typography, and motion pacing',
    'Ability to handle projects from initial concept storyboard to final composite'
  ],
  ARRAY[
    'Top-tier compensation: $130,000 – $165,000 / year (25% above US industry median)',
    'Full healthcare coverage (medical, dental, vision)',
    '401(k) with 5% employer match',
    'Top-spec 3D rendering workstation / cloud GPU rendering budget provided',
    'Remote work culture with flexible hours'
  ],
  'published'
),
(
  'Email Marketing & Lifecycle Automation Lead',
  'email-marketing-automation-lead',
  'Chicago, IL (Remote - US)',
  'Marketing & Growth',
  'Full Time',
  'Architect high-converting email sequences, SMS automation flows, and personalized retention journeys in Klaviyo / Customer.io.',
  'We are looking for an Email Marketing & Lifecycle Automation Lead to build and optimize automated communication flows that drive customer retention and lifetime value.

You will manage email marketing campaigns, segment customer databases, conduct multivariate copy tests, and turn lifecycle communication into a major revenue engine.',
  ARRAY[
    'Design and execute automated email and SMS journeys (welcome series, browse abandonment, post-purchase, re-engagement)',
    'Manage database segmentation, list hygiene, deliverability protocols (DKIM, SPF, DMARC), and compliance (CAN-SPAM, TCPA)',
    'A/B test subject lines, send times, content modules, and dynamic personalization to increase open and conversion rates',
    'Build executive dashboards tracking retention metrics, unsubscribe rates, and revenue per recipient'
  ],
  ARRAY[
    '4+ years of email and lifecycle marketing experience using platforms such as Klaviyo, Customer.io, or Iterable',
    'Strong copywriting ability and understanding of email HTML/CSS design standards across email clients',
    'Data-driven approach with expertise in customer segmentation, behavioral triggers, and cohort analytics',
    'Experience driving significant e-commerce or subscription revenue through lifecycle channels'
  ],
  ARRAY[
    'Top-tier compensation: $110,000 – $138,000 / year (25% above market standard)',
    'Comprehensive healthcare insurance (medical, dental, vision)',
    '401(k) plan with 5% match',
    '$2,000 home office and education budget',
    'Unlimited PTO and flexible remote working'
  ],
  'published'
),
(
  'Full Stack Web Application Engineer',
  'full-stack-web-engineer',
  'Seattle, WA (Remote - US)',
  'Engineering & Web',
  'Full Time',
  'Build robust full-stack web platforms, REST/GraphQL APIs, and real-time database applications using Next.js, Node.js, and PostgreSQL.',
  'We are seeking an experienced Full Stack Web Application Engineer to develop robust, scalable web products and backend services.

You will work across the entire stack—designing relational database schemas, implementing secure API endpoints, building interactive React interfaces, and deploying scalable cloud infrastructure.',
  ARRAY[
    'Design and build full-stack web architectures using Next.js, Node.js, TypeScript, and PostgreSQL / Supabase',
    'Develop secure, RESTful and real-time WebSocket APIs with strict authentication and role-based permissions',
    'Write clean, well-tested, maintainable code with automated CI/CD pipelines',
    'Monitor system reliability, performance metrics, and database query optimization in production'
  ],
  ARRAY[
    '5+ years of professional full-stack development experience building scalable web applications',
    'Strong proficiency in TypeScript, React/Next.js, Node.js, SQL, and database indexing',
    'Experience with cloud architectures, serverless functions, authentication protocols, and API security',
    'Collaborative mindset with strong problem-solving and architectural communication skills'
  ],
  ARRAY[
    'Top-tier compensation: $160,000 – $195,000 / year + Equity Package (30% above US market)',
    '100% company-paid medical, dental, and vision insurance',
    '401(k) with 6% dollar-for-dollar employer match',
    '$3,000 yearly tech equipment & home workstation allowance',
    'Full remote autonomy across all US locations'
  ],
  'published'
),
(
  'Influencer Marketing & Brand Partnerships Lead',
  'influencer-marketing-brand-partnerships',
  'Miami, FL (Hybrid / Remote - US)',
  'Marketing & Growth',
  'Full Time',
  'Source, negotiate, and execute high-impact influencer partnerships and creator sponsorship deals across YouTube, TikTok, and podcasts.',
  'Northfield is hiring an Influencer Marketing & Brand Partnerships Lead to scale our creator ambassador program and manage strategic brand collaborations.

You will identify high-fit creators, negotiate partnership agreements, oversee campaign deliverables, and ensure all sponsored activations achieve measurable brand reach and ROI.',
  ARRAY[
    'Identify, outreach, and negotiate sponsorship contracts with top creators across TikTok, YouTube, and podcasts',
    'Manage campaign workflows, product seeding, brief distribution, and FTC compliance',
    'Track influencer promo codes, affiliate links, and attribution metrics to calculate creator ROI and CAC',
    'Build long-term ambassador relationships with tier-1 creators and industry tastemakers'
  ],
  ARRAY[
    '4+ years of influencer marketing and creator partnership management in the US market',
    'Established network of creator and talent agency relationships across social platforms',
    'Strong negotiation skills and contract familiarity with sponsorship deliverables and usage rights',
    'Analytical mindset focused on creator ROI, engagement rates, and acquisition metrics'
  ],
  ARRAY[
    'Top-tier compensation: $115,000 – $145,000 / year + Quarterly Commission & Bonus (25% above market)',
    'Full medical, dental, and vision benefits',
    '401(k) with 5% company match',
    '$2,500 travel and creator networking budget',
    'Flexible hybrid/remote options'
  ],
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  location = EXCLUDED.location,
  department = EXCLUDED.department,
  employment_type = EXCLUDED.employment_type,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  responsibilities = EXCLUDED.responsibilities,
  requirements = EXCLUDED.requirements,
  benefits = EXCLUDED.benefits,
  status = EXCLUDED.status;

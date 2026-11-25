# MASTER DEVELOPMENT PROMPT — MICKEYCHAN.IN

## Complete Website Expansion, Feature Development & Modernization

You are an expert full-stack developer, UI/UX designer, software architect, database engineer, and security specialist.

Your task is to thoroughly inspect, improve, and expand **https://mickeychan.in** into a comprehensive, interactive creator platform and community ecosystem.

This is not a request to simply redesign the homepage. The objective is to evolve the existing website into a polished, feature-rich platform that brings together:

- YouTube content and video discovery
- Creator information and social media
- Community interaction
- Minecraft-related activities
- ARG (Alternate Reality Game) experiences
- Interactive puzzles and Easter eggs
- User accounts and personalized dashboards
- Recruitment and team management
- Announcements and events
- Administrative management tools

The finished website should feel like a unified digital home for the Mickey Chan creator universe.

---

# PART 1 — IMPORTANT DEVELOPMENT RULES

Before implementing anything, follow these requirements.

### 1. Inspect the entire existing project

Thoroughly inspect the existing codebase, including:

- Frontend architecture
- Backend architecture
- Database structure
- API endpoints
- Authentication system
- User roles and permissions
- Existing components
- Styling and design system
- Admin dashboard
- Form builder
- Audit system
- Existing integrations
- Environment configuration
- Existing website routes

Do not assume how something works. Read the implementation.

### 2. Inspect every website page

Visit the following pages and inspect their current functionality:

- `/`
- `/videos`
- `/announcements`
- `/socials`
- `/positions`
- `/join`
- `/login`
- `/register`
- `/verify`
- `/forgot-password`
- `/admin`
- `/audit`
- `/form-builder`
- `/sitemap`

Also inspect:

- Any additional pages listed in the sitemap
- Any dynamically generated routes
- User account pages
- Any accessible authenticated pages
- Any existing API-backed interfaces

Use the sitemap to discover additional pages rather than limiting the inspection to this list.

For password-protected or authenticated pages, inspect the available implementation and determine their existing functionality without attempting to bypass access controls.

### 3. Preserve existing functionality

This is extremely important.

- Do not unnecessarily replace the existing application.
- Do not remove existing features.
- Do not break existing routes.
- Do not discard existing database records.
- Do not break authentication or social login.
- Do not replace working functionality with static mockups.
- Do not create duplicate systems when an existing implementation can be extended.
- Maintain compatibility with existing APIs and database structures wherever possible.

Before changing database structures, inspect the existing schema and design safe migrations.

### 4. Work with the existing design

Preserve the recognizable MickeyChan.in visual identity.

Improve the design where appropriate, but do not turn the website into an unrelated generic template.

The website should feel:

- Modern
- Premium
- Creative
- Gaming-oriented
- Minecraft-inspired where appropriate
- Interactive
- Visually consistent
- Responsive
- Fast

Avoid excessive animations, unnecessary gradients, oversized typography, and cluttered interfaces.

### 5. Implement real functionality

Every feature must actually work.

Do not create:

- Fake buttons
- Nonfunctional navigation links
- Placeholder dashboards presented as finished features
- Fake statistics
- Hardcoded user data
- Simulated authentication
- Nonfunctional forms
- Static interfaces pretending to have database integration

Use actual backend functionality and persistent storage wherever necessary.

If a feature requires an external integration that is unavailable, implement a clean integration interface and clearly document what remains to be configured.

---

# PART 2 — HOMEPAGE EXPANSION

Improve the homepage while retaining its existing creator-focused identity.

## 2.1 Featured video hero

Create an improved featured-video section.

Include:

- Large featured video thumbnail
- Video title
- Short description
- Play button
- YouTube channel identification
- View count when available
- Publication date
- Link to the complete video page

Allow administrators to select the featured video.

## 2.2 Live channel statistics

Display updated statistics for both YouTube channels.

Potential statistics:

- Subscribers
- Total views
- Total videos
- Latest upload
- Channel milestones

Use the YouTube API or an existing integration if available.

Implement caching and sensible refresh intervals to avoid unnecessary API requests.

Never fabricate statistics when data is unavailable.

## 2.3 Video of the week

Create a section highlighting a selected video.

Allow administrators to:

- Select a video
- Set a start date
- Set an end date
- Add a short description
- Schedule future selections

## 2.4 Community activity ticker

Show relevant recent activity, including:

- New announcements
- Upcoming events
- Newly released videos
- ARG updates
- Recruitment announcements

Allow administrators to control which activity types appear.

## 2.5 Upcoming events

Display upcoming events with:

- Event title
- Description
- Date and time
- Countdown
- Event image
- Registration link
- Event status

## 2.6 Featured community members

Highlight selected community contributors, puzzle solvers, or event participants.

Only display users who have consented to public recognition.

## 2.7 ARG activity preview

Show the latest ARG storyline update or recently released clue.

Link directly to the ARG portal.

## 2.8 Creator milestones

Display significant milestones, such as:

- Subscriber milestones
- Major video view milestones
- Channel anniversaries
- Important collaborations

Allow administrators to manage milestone entries.

---

# PART 3 — VIDEO LIBRARY EXPANSION

Expand `/videos` into a comprehensive video discovery platform.

## 3.1 Advanced search

Implement a functional search system.

Search across:

- Video titles
- Descriptions
- Tags
- Categories
- Collaborators
- Series names

Include:

- Search suggestions
- Clear search button
- Empty-state messages
- Search result counts

## 3.2 Advanced filtering

Support filters for:

- YouTube channel
- Shorts versus long-form videos
- Category
- Genre
- Minecraft series
- Collaborators
- Publication date
- Video duration
- Tags

Allow multiple filters to be applied simultaneously.

Provide a clear-all-filters option.

## 3.3 Sorting

Allow sorting by:

- Newest
- Oldest
- Most viewed
- Least viewed
- Most popular
- Alphabetical
- Duration

Use actual available video metadata.

## 3.4 Dedicated video pages

Create a dedicated page for each video.

Suggested route:

`/videos/[video-id]`

Each page should include:

- Embedded YouTube player
- Thumbnail
- Title
- Description
- Publication date
- Channel information
- View count
- Video duration
- Tags
- Categories
- Collaborators
- Related videos
- Share buttons
- Copy-link button
- Watch-later button
- Playlist functionality

If reliable engagement data is available, display it.

Do not invent likes, comments, or other statistics.

## 3.5 Custom playlists

Allow authenticated users to create playlists.

Features:

- Create playlist
- Rename playlist
- Delete playlist
- Add videos
- Remove videos
- Reorder videos
- Public or private visibility
- Playlist descriptions
- Shareable public playlist URLs

## 3.6 Watch history

Track video viewing activity for authenticated users where technically and legally appropriate.

Include:

- Watch history
- Recently watched
- Continue watching
- Clear history
- Individual history removal

Respect user privacy and provide controls to disable tracking.

## 3.7 Watch later

Allow users to save videos for later.

Include:

- Add to watch later
- Remove from watch later
- View saved videos
- Sort saved videos

## 3.8 Trending videos

Create dynamic sections:

- Trending this week
- Most viewed this month
- Most viewed all-time
- Recently uploaded
- Popular Shorts
- Hidden gems

Use available analytics and clearly define the ranking methodology.

## 3.9 Personalized recommendations

Recommend videos based on:

- Previously watched content
- Saved videos
- Favorite categories
- Selected channels
- Popular content

Allow users to disable personalization.

## 3.10 Channel-specific browsing

Support dedicated views for each channel.

For example:

- `/videos/mickeychan`
- `/videos/mickeytv`

Include each channel's content, description, statistics, and latest uploads.

## 3.11 Shorts browsing mode

Provide a dedicated Shorts browsing interface.

Use vertical video cards and make navigation intuitive on mobile and desktop.

## 3.12 Random video discovery

Add a random video button.

Allow optional filters before selecting a random video.

---

# PART 4 — ARG PORTAL

Create a dedicated ARG section.

Suggested route:

`/arg`

This should become one of the website's defining features.

The ARG portal should feel mysterious and immersive without compromising usability or accessibility.

## 4.1 ARG landing page

Include:

- Current active mysteries
- Completed mysteries
- Recently discovered clues
- Latest storyline updates
- Community theories
- Puzzle progress
- Featured mystery

## 4.2 Storyline management

Create an ARG storyline system.

Each storyline should contain:

- Title
- Description
- Cover image
- Start date
- Completion date
- Status
- Difficulty
- Associated videos
- Associated clues
- Associated puzzles
- Storyline timeline

Possible statuses:

- Upcoming
- Active
- Completed
- Archived

Administrators should be able to create and manage storylines.

## 4.3 Interactive puzzle system

Implement a reusable puzzle engine.

Support puzzle types such as:

- Text decoding
- Cipher puzzles
- Image-based clues
- Word puzzles
- Number sequences
- Logic puzzles
- Multiple-choice questions
- Password-entry puzzles
- Multi-stage puzzles

Each puzzle should support:

- Title
- Description
- Instructions
- Optional hints
- Correct answer validation
- Completion message
- Points or achievements
- Difficulty
- Associated storyline
- Unlock requirements

Answers must be validated securely on the server.

Do not expose correct answers in client-side code.

## 4.4 Clue management

Create a clue database.

Each clue should support:

- Title
- Description
- Image or attachment
- Discovery location
- Associated video
- Associated storyline
- Discovery date
- Optional solution
- Unlock conditions

Allow administrators to publish clues independently.

## 4.5 ARG progress tracking

For authenticated users, track:

- Discovered clues
- Completed puzzles
- Current storyline progress
- Unlocked content
- Earned achievements

Allow users to resume where they left off.

## 4.6 Community investigation board

Create a moderated discussion area.

Allow users to:

- Publish theories
- Reply to theories
- Upvote useful theories
- Attach relevant clue references
- Mark a theory as resolved

Include reporting, moderation, spam protection, and rate limits.

Do not expose private user information.

## 4.7 Secret pages and Easter eggs

Support administrator-created hidden pages.

Possible discovery methods:

- Special URLs
- Puzzle solutions
- Clues in videos
- Hidden website interactions
- Announcement references

Include visibility and expiration settings.

Do not make secret pages an authentication or security bypass.

## 4.8 ARG achievements

Possible achievements:

- First Clue Found
- Code Breaker
- Mystery Solver
- Master Detective
- First to Solve
- Puzzle Explorer

Store achievement unlocks persistently.

---

# PART 5 — COMMUNITY FEATURES

Build a community system around existing user accounts.

## 5.1 Public user profiles

Suggested route:

`/community/[username]`

Profile information:

- Username
- Profile picture
- Optional biography
- Minecraft username, if voluntarily provided
- Join date
- Favorite videos
- Earned badges
- Public achievements
- Public playlists
- Community contributions

Allow users to control profile visibility.

## 5.2 Community polls

Create a poll system.

Administrators should be able to create polls containing:

- Question
- Multiple answer choices
- Start date
- End date
- Optional image
- Multiple-selection setting
- Public or restricted participation
- Results visibility

Users should be able to vote.

Prevent duplicate voting using server-side validation.

Display results using charts or percentage bars.

## 5.3 Community leaderboard

Create leaderboards for:

- Weekly points
- Monthly points
- All-time points
- ARG achievements
- Puzzle completions
- Event participation

Points should be awarded through clearly defined, abuse-resistant activities.

Do not reward spam, repetitive low-effort actions, or artificial engagement.

Allow users to opt out of public ranking.

## 5.4 Achievement system

Create a reusable achievement engine.

Achievements should support:

- Name
- Description
- Icon
- Unlock condition
- Rarity
- Points
- Visibility

Display earned achievements on profiles.

## 5.5 Community events

Create an event management system.

Each event should include:

- Title
- Description
- Banner
- Date and time
- Time zone
- Registration deadline
- Maximum participants
- Registration status
- Event category
- External link, if applicable

Support:

- Registration
- Cancellation
- Participant lists for authorized administrators
- Event reminders
- Event status updates

## 5.6 Community idea board

Create a feature request and suggestion platform.

Users can:

- Submit ideas
- Vote on ideas
- Comment
- Track progress

Administrators can set statuses:

- Under consideration
- Planned
- In development
- Completed
- Not planned

Prevent duplicate submissions where practical.

## 5.7 Community moderation

Implement:

- Report buttons
- Content moderation queue
- User restrictions
- Spam protection
- Rate limiting
- Comment deletion
- Moderation history

Include appropriate safeguards for a community that may include younger visitors.

---

# PART 6 — CREATOR AND TEAM FEATURES

## 6.1 Behind-the-scenes section

Create a section for:

- Behind-the-scenes videos
- Bloopers
- Editing processes
- Minecraft builds
- Recording highlights
- Production stories

Allow administrators to categorize content.

## 6.2 Meet the team

Create team member profile pages.

Each profile should include:

- Display name
- Profile picture
- Role
- Biography
- Contributions
- Optional social links
- Associated videos

Support roles such as:

- Creator
- Editor
- Builder
- Developer
- Designer
- Moderator
- Collaborator

## 6.3 Video idea submissions

Create a public suggestion form.

Allow visitors to submit:

- Minecraft challenges
- Video concepts
- Collaboration suggestions
- Other creative ideas

Allow optional account association.

Administrators should be able to review, categorize, archive, and update submissions.

## 6.4 Upcoming videos

Create an upcoming-content section.

Support:

- Teasers
- Scheduled releases
- Premiere dates
- Countdown timers
- Associated channel
- Optional thumbnail
- Publication status

Allow administrators to control public visibility.

---

# PART 7 — USER DASHBOARD

Create a personalized dashboard.

Suggested route:

`/dashboard`

Only accessible to authenticated users.

## Dashboard sections

### Overview

- Welcome message
- Profile summary
- Recent activity
- Notifications
- Upcoming events

### My videos

- Watch later
- Watch history
- Custom playlists
- Favorite videos

### My ARG progress

- Active storylines
- Discovered clues
- Completed puzzles
- Achievements

### My community

- Poll participation
- Event registrations
- Submitted suggestions
- Community contributions

### My applications

- Submitted applications
- Application status
- Requests for additional information

### Account settings

- Profile editing
- Privacy controls
- Notification preferences
- Connected accounts
- Password and security settings

Use a clean, modular dashboard layout.

---

# PART 8 — RECRUITMENT SYSTEM

Improve `/positions` and its application workflow.

## 8.1 Job listings

Each role should contain:

- Position title
- Department
- Description
- Responsibilities
- Requirements
- Preferred qualifications
- Expected weekly availability
- Experience level
- Application deadline
- Compensation information, if applicable
- Required application materials

Support categories such as:

- Video editing
- Minecraft building
- Graphic design
- Development
- Moderation
- Other creative roles

## 8.2 Application forms

Support role-specific application forms.

Allow administrators to configure:

- Short text questions
- Long text questions
- Multiple-choice questions
- Checkboxes
- Dropdowns
- File attachments
- Portfolio URLs

Reuse and extend the existing form builder where possible.

## 8.3 Application drafts

Allow applicants to save incomplete applications and resume later.

## 8.4 Application tracking

Suggested statuses:

- Draft
- Submitted
- Under review
- Shortlisted
- Interview requested
- Accepted
- Rejected
- Withdrawn

Applicants should be able to view their own application status.

## 8.5 Applicant notifications

Notify applicants about:

- Submission confirmation
- Status changes
- Interview requests
- Additional information requests
- Final decisions

## 8.6 Applicant portfolio

Allow applicants to provide:

- Editing samples
- Minecraft builds
- Graphic designs
- Development projects
- Other relevant work

Use secure file upload validation.

## 8.7 Team onboarding

For accepted applicants, provide an onboarding workflow.

Include:

- Welcome information
- Team guidelines
- Role-specific resources
- Required onboarding tasks
- Completion tracking

Only authorized administrators should be able to access private applicant information.

---

# PART 9 — ANNOUNCEMENT SYSTEM

Improve `/announcements`.

## Features

- Announcement categories
- Search
- Date filters
- Pinned announcements
- Priority labels
- Emergency notices
- Images and attachments
- Scheduled publishing
- Expiration dates
- Read/unread status
- Announcement archives
- Category subscriptions
- Email notifications
- Homepage announcement banners

Suggested categories:

- General
- YouTube
- Discord
- Recruitment
- Community
- Events
- ARG

Administrators should be able to preview announcements before publishing.

---

# PART 10 — SOCIALS PAGE

Improve `/socials`.

Include:

- YouTube channel cards
- Live subscriber statistics
- Latest uploads
- Instagram links and optional post highlights
- Discord server cards
- Upcoming livestreams
- Social activity feed
- Creator media kit
- Business contact information
- Copy-link buttons
- Collaborator profiles

Use official APIs or supported integrations where available.

Do not scrape platforms in ways that violate their terms.

---

# PART 11 — CONTACT SYSTEM

Improve `/join`.

The current account requirement for contact should be reconsidered.

## Public contact form

Allow visitors to submit ordinary enquiries without creating an account.

Enquiry categories:

- General
- Collaboration
- Sponsorship
- Business
- Suggestions
- Support

Form fields:

- Name or preferred display name
- Email address
- Enquiry category
- Subject
- Message
- Optional attachment

## Contact management

Implement:

- Automatic submission confirmation
- Enquiry reference numbers
- Spam protection
- Admin inbox
- Status tracking
- Internal notes
- Email notifications
- Optional account-based enquiry tracking

Keep recruitment applications separate from general enquiries.

---

# PART 12 — ACCOUNT AND AUTHENTICATION IMPROVEMENTS

Preserve the existing login and registration system.

Improve it with:

- Two-factor authentication
- Passkey support, where practical
- Session management
- Login activity history
- Profile customization
- Notification preferences
- Connected account management
- Email change verification
- Password strength feedback
- Improved recovery experience
- Account deletion
- Personal data export

Preserve existing Google and Discord authentication if currently supported.

Implement appropriate protections against:

- Brute-force attacks
- Credential abuse
- Session theft
- Account enumeration
- CSRF
- XSS
- SQL injection

Use secure session handling and password hashing.

---

# PART 13 — ADDITIONAL CREATIVE FEATURES

These features should help make MickeyChan.in distinctive.

## 13.1 Interactive Minecraft world map

Create a Minecraft-inspired interactive navigation experience.

Possible locations:

- Video Village
- ARG Laboratory
- Community Castle
- Announcement Board
- Recruitment Headquarters
- Trophy Room

Each location should link to its corresponding website section.

The map must have an accessible conventional navigation alternative.

## 13.2 Digital trophy room

Create a gallery showcasing:

- Subscriber milestones
- Popular videos
- Collaborations
- Channel anniversaries
- Community achievements
- Special events

## 13.3 Weekly treasure hunt

Introduce a recurring website puzzle.

Users can discover hidden collectibles and earn achievements.

Administrators should be able to schedule new treasure hunts.

## 13.4 Minecraft challenge generator

Create a random Minecraft challenge generator.

Categories:

- Survival
- Building
- Puzzle
- Multiplayer
- Creative restrictions
- General challenges

Allow administrators to add, edit, and remove challenge entries.

Include filters and a randomize button.

## 13.5 Video museum

Create a chronological video archive.

Organize videos by:

- Year
- Series
- Channel
- Collaborator
- Category
- Major milestones

Use a timeline or gallery layout.

## 13.6 Secret content system

Allow administrators to publish hidden content that becomes accessible after discovering specific clues or completing puzzles.

Ensure secret content is not accidentally exposed through APIs, page source, or search indexing before being unlocked.

---

# PART 14 — SMALL QUALITY-OF-LIFE IMPROVEMENTS

Implement appropriate improvements throughout the website.

1. Global search bar.
2. Improved video tags.
3. Advanced sorting.
4. Random video button.
5. Copy video links.
6. Recently added badges.
7. Video duration filters.
8. Persistent theme preference.
9. Skeleton loading states.
10. Back-to-top button.
11. Breadcrumb navigation.
12. Social sharing preview metadata.
13. Custom 404 page.
14. Maintenance page.
15. Optional newsletter signup.
16. Announcement archive filters.
17. Share buttons.
18. Collaborator tags.
19. Accessibility improvements.
20. Better mobile navigation.
21. Improved empty states.
22. Improved loading and error states.
23. Consistent confirmation dialogs.
24. Toast notifications.
25. Form validation.
26. Keyboard shortcuts where appropriate.
27. Consistent pagination.
28. Better image optimization.
29. Consistent date and time formatting.
30. Search engine optimization.

These improvements should be integrated into existing pages rather than implemented as disconnected components.

---

# PART 15 — ADMIN DASHBOARD EXPANSION

Inspect the existing `/admin`, `/audit`, and `/form-builder` implementations before extending them.

Build upon existing administrative capabilities.

## Admin overview

Display:

- Website traffic
- User registrations
- Video activity
- Announcement activity
- Recruitment applications
- Community activity
- Active ARG participation
- Upcoming events

Only show metrics supported by actual data.

## Content management

Allow administrators to manage:

- Homepage content
- Featured videos
- Video metadata
- Announcements
- Social links
- Team profiles
- Events
- ARG storylines
- Puzzles
- Clues
- Secret pages
- Achievements
- Challenge generator entries

## User management

Allow authorized administrators to:

- View users
- Edit permitted profile information
- Manage roles
- Restrict accounts
- Review reports
- Manage permissions

## Recruitment management

Include:

- Application lists
- Filters
- Applicant details
- Status updates
- Internal notes
- Portfolio previews
- CSV export

## Form builder

Improve the existing form builder with:

- Drag-and-drop fields
- Conditional questions
- Required fields
- Reusable templates
- Form previews
- Validation rules
- File upload fields

## Audit log

Improve the audit system with:

- Administrator identification
- Action type
- Timestamp
- Affected resource
- Search
- Filters
- Pagination
- Export

Audit records should be tamper-resistant.

## Content scheduling

Support:

- Scheduled publication
- Automatic expiration
- Drafts
- Preview mode
- Revision history

## Admin permissions

Use role-based access control.

Possible roles:

- Super Administrator
- Administrator
- Content Manager
- Recruitment Manager
- Moderator
- Analyst

Apply least-privilege permissions.

Never rely exclusively on frontend checks for access control.

---

# PART 16 — DESIGN AND USER EXPERIENCE

Maintain a consistent design system across the entire application.

## Visual direction

Use a polished gaming/creator aesthetic.

Potential characteristics:

- Dark-first interface
- Carefully selected accent colors
- Minecraft-inspired visual details
- Modern typography
- High-quality imagery
- Consistent rounded cards
- Subtle borders
- Thoughtful spacing
- Restrained animations

Do not make every page look identical. Different sections can have distinct visual identities while sharing common design tokens.

For example:

- Videos: Media-focused.
- ARG: Mysterious and immersive.
- Community: Friendly and interactive.
- Recruitment: Professional.
- Admin: Functional and information-dense.

## Responsive design

Support:

- Desktop
- Laptop
- Tablet
- Mobile

Ensure:

- No horizontal overflow
- Usable navigation
- Responsive grids
- Readable text
- Accessible interactive elements
- Properly scaled media

## Accessibility

Follow WCAG 2.2 AA principles where practical.

Include:

- Keyboard navigation
- Visible focus states
- Semantic HTML
- Appropriate contrast
- Screen-reader labels
- Alternative image text
- Reduced-motion support
- Accessible forms

---

# PART 17 — DATABASE AND BACKEND ARCHITECTURE

Before implementing backend features, inspect the current database.

Extend the existing architecture rather than creating competing systems.

Potential entities include:

- Users
- UserProfiles
- UserPreferences
- UserSessions
- Notifications
- Videos
- VideoCategories
- VideoTags
- VideoCollaborators
- WatchHistory
- SavedVideos
- Playlists
- PlaylistVideos
- Announcements
- AnnouncementSubscriptions
- Events
- EventRegistrations
- Polls
- PollOptions
- PollVotes
- CommunityPosts
- CommunityComments
- CommunityReports
- Ideas
- IdeaVotes
- Achievements
- UserAchievements
- ARGStorylines
- ARGClues
- ARGPuzzles
- ARGPuzzleAttempts
- ARGProgress
- ARGTheories
- TeamMembers
- JobPositions
- Applications
- ApplicationResponses
- ApplicationAttachments
- ContactEnquiries
- ChallengeEntries
- Milestones
- AuditLogs

These are conceptual entities, not mandatory separate tables.

Use appropriate relationships, indexes, unique constraints, and transactions.

Implement:

- Database migrations
- Input validation
- Server-side authorization
- API rate limiting
- Pagination
- Caching
- Error handling
- Secure file storage
- Logging

Do not create unnecessary tables if the existing schema already represents the same concepts.

---

# PART 18 — SECURITY, PRIVACY AND MODERATION

Security must be considered throughout development.

Implement:

- Server-side permission checks
- Secure authentication
- Input sanitization
- SQL injection protection
- CSRF protection where applicable
- XSS prevention
- File upload validation
- Rate limiting
- Spam protection
- Secure session management
- Audit logging
- Privacy controls
- Data retention policies
- Account deletion
- Appropriate content moderation

Because the website may attract younger visitors:

- Do not publicly expose private contact details.
- Do not expose applicants' personal information.
- Do not enable unrestricted direct messaging by default.
- Provide reporting and moderation functionality.
- Avoid collecting unnecessary personal information.
- Make public profiles optional.
- Provide clear privacy controls.
- Avoid gambling-like reward mechanics.

---

# PART 19 — PERFORMANCE AND SEO

Optimize the entire application.

## Performance

- Lazy-load images.
- Optimize thumbnails.
- Use responsive images.
- Minimize unnecessary JavaScript.
- Cache appropriate API responses.
- Avoid redundant database queries.
- Use pagination or incremental loading.
- Prevent layout shifts.
- Optimize fonts.
- Reduce unnecessary animations.

## SEO

Implement appropriate:

- Page titles
- Meta descriptions
- Canonical URLs
- Open Graph metadata
- Social sharing previews
- XML sitemap
- Robots.txt
- Structured data where appropriate
- Breadcrumb metadata

Public content should be indexable where appropriate.

Private dashboards, account pages, application records, and unreleased ARG content should not be publicly indexed.

---

# PART 20 — IMPLEMENTATION PRIORITIES

Do not attempt to implement every feature in an uncontrolled manner.

Organize development into the following phases.

## PHASE 0 — Existing application audit

- Inspect the complete codebase.
- Inspect the sitemap and all existing routes.
- Understand the existing database.
- Identify existing functionality.
- Identify bugs and technical debt.
- Create an implementation plan.
- Identify integration dependencies.

Deliver an audit report before making major architectural changes.

## PHASE 1 — Core improvements

Implement:

1. Global search.
2. Advanced video filters.
3. Dedicated video pages.
4. Better video browsing.
5. Public contact form.
6. Recruitment improvements.
7. Improved announcements.
8. Improved mobile navigation.
9. Consistent loading and error states.
10. Basic SEO improvements.

## PHASE 2 — User engagement

Implement:

1. User profiles.
2. Personalized dashboard.
3. Watch later.
4. Watch history.
5. Custom playlists.
6. Community polls.
7. Events calendar.
8. Notifications.
9. Achievement system.
10. Community idea board.

## PHASE 3 — ARG ecosystem

Implement:

1. ARG landing page.
2. Storyline management.
3. Puzzle engine.
4. Clue database.
5. Progress tracking.
6. Community investigation board.
7. Secret pages.
8. ARG achievements.
9. Weekly treasure hunt.

## PHASE 4 — Creator ecosystem

Implement:

1. Behind-the-scenes section.
2. Team profiles.
3. Video idea submissions.
4. Upcoming videos.
5. Creator media kit.
6. Digital trophy room.
7. Video museum.
8. Minecraft challenge generator.

## PHASE 5 — Administrative expansion

Implement:

1. Admin analytics.
2. Content management.
3. Recruitment management.
4. User management.
5. Improved form builder.
6. Improved audit log.
7. Content scheduling.
8. Role-based permissions.

## PHASE 6 — Advanced expansion

Implement:

1. Personalized recommendations.
2. Community leaderboard.
3. Interactive Minecraft world map.
4. Advanced social integrations.
5. Advanced analytics.
6. Additional accessibility and performance optimizations.

---

# PART 21 — TESTING AND QUALITY ASSURANCE

Test all implemented functionality.

## Functional testing

Verify:

- Navigation
- Search
- Filters
- Sorting
- Video pages
- Playlists
- Watch history
- Authentication
- Registration
- Email verification
- Password recovery
- User profiles
- Poll voting
- Event registration
- Puzzle validation
- ARG progress
- Applications
- Contact submissions
- Notifications
- Admin functionality

## Security testing

Verify:

- Unauthorized access is blocked.
- Users cannot modify other users' records.
- Applicants cannot access other applications.
- Moderators cannot access super-admin functionality.
- Private information is not leaked through APIs.
- Puzzle answers cannot be extracted from client-side code.
- File uploads are validated.
- Rate limits work.

## UI testing

Test:

- Desktop
- Tablet
- Mobile
- Light mode, if supported
- Dark mode
- Empty states
- Loading states
- Error states
- Long content
- Small screens

## Regression testing

Ensure all original website features continue to work.

Do not consider a feature complete simply because its interface renders.

---

# PART 22 — FINAL DELIVERABLES

At the end of the project, provide:

1. A summary of the original application architecture.
2. A list of inspected routes and existing features.
3. A list of newly implemented features.
4. A list of modified existing features.
5. Database migrations.
6. API endpoint documentation.
7. Environment variable documentation.
8. External integration setup instructions.
9. Security and permission documentation.
10. Testing results.
11. Known limitations.
12. Features that still require external configuration.

Maintain clean, readable, maintainable code.

Do not leave unfinished functionality disguised as completed work.

---

# FINAL INSTRUCTION

Your overall objective is to transform MickeyChan.in from a creator information and video website into a complete, interactive creator ecosystem.

The website should have four central pillars:

**WATCH** — Discover videos, Shorts, playlists, series, and creator content.

**CONNECT** — Interact with the community, participate in polls, join events, and explore profiles.

**DISCOVER** — Investigate ARG storylines, solve puzzles, uncover clues, and find hidden content.

**ACHIEVE** — Collect achievements, track progress, participate in events, and contribute to the community.

The ARG portal and community experience should become the website's most distinctive features, while the existing video library remains its primary content foundation.

Most importantly:

**Build on the existing MickeyChan.in application, not alongside it.**

Inspect first. Plan carefully. Implement incrementally. Preserve existing functionality. Test everything. Deliver production-quality features rather than superficial mockups.

---

# ADDITIONAL MASTER REQUIREMENT — ADMIN CONTROL CENTER

Expand the existing MickeyChan.in Admin tab into a comprehensive, centralized administration platform.

Before implementation, inspect the existing admin interface, authentication, permissions, database, audit system, and form builder. Extend existing functionality instead of creating duplicate systems.

The admin interface should include these modules:

1. Admin Overview Dashboard
2. Website Content Management
3. User Management
4. Roles and Permissions
5. Recruitment Management
6. ARG Management
7. Announcement and Notification Management
8. Contact and Support Inbox
9. Community Moderation
10. Website Appearance Editor
11. Media Library
12. Website Analytics
13. System Health and Diagnostics
14. Backup and Maintenance Center
15. Audit and Security Center
16. Global Admin Search
17. Quick Actions
18. Scheduled Tasks
19. Draft and Revision Management
20. Integration Management

Use a consistent sidebar-based administrative layout with responsive navigation.

Implement role-based permissions and server-side authorization for every administrative operation.

The Super Admin should be able to configure custom roles and granular permissions.

All administrative actions that modify data must be validated and securely processed by the backend.

Sensitive operations such as account restrictions, deletion, permission changes, database restoration, and destructive bulk actions must require appropriate elevated permissions and explicit confirmation.

Provide searchable tables, filters, pagination, sorting, bulk actions where appropriate, confirmation dialogs, notifications, and detailed empty/loading/error states.

All analytics must use actual available data. Do not display fabricated statistics.

The admin dashboard should provide a unified overview of website traffic, users, content, recruitment, ARG participation, community activity, and system health.

Create a global search that allows authorized administrators to locate users, videos, announcements, applications, events, and other records.

Implement administrator activity tracking through the existing audit system. Record important administrative changes with timestamps, actor identity, affected resources, and action metadata. Protect audit records against unauthorized modification.

Add content preview, drafts, scheduled publishing, revision history, and restoration wherever appropriate.

The admin interface must remain consistent with the existing MickeyChan.in visual identity while being optimized for productivity, clarity, and efficient navigation.

Do not expose credentials, tokens, passwords, private applicant records, or sensitive user information unnecessarily.

Test every administrative module, including permissions, backend authorization, data persistence, audit recording, and responsive behavior.

The final result should feel like a professional, production-ready control center capable of managing the entire MickeyChan.in platform.

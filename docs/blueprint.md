# **App Name**: QueUp

## Core Features:

- Citizen Queue Browsing & Selection: Allows users to discover provinces, browse available government branches, and select specific service categories. Features live congestion indicators and estimated wait times.
- Multi-Channel Queue Joining: Facilitates joining a queue from home (requiring payment), via scanning a QR code at the branch, or using an in-branch kiosk, with corresponding authentication/registration flows.
- Live Citizen Queue Tracking: Provides a real-time dashboard for citizens to track their position in the queue, receive dynamic wait time estimates, and get notifications as their turn approaches.
- Secure User Authentication & Profiles: Implements secure sign-up, login, and profile management for citizens and staff using Firebase Authentication, supporting different roles and access controls.
- Consultant Queue Management Dashboard: A desktop-optimized dashboard for government staff to view, manage, call, and mark served/no-show tickets, with real-time updates and search functionality.
- Dynamic Waiting Room TV Display: A high-contrast, large-text display for waiting rooms, showing currently serving and upcoming ticket numbers with animations, updating in real-time from Firestore.
- AI-Powered Queue Insights Tool: Provides data-driven recommendations, such as optimal visiting times and less congested branches, leveraging historical and real-time queue data to inform user decisions.

## Style Guidelines:

- Primary action color: A vibrant lime green (#C4F135) for interactivity, accents, and promoting a sense of efficiency and freshness. This color stands out boldly against dark backgrounds.
- Dark Mode Background: A deep, almost black hue (#0A0A0A) serving as the default application background, conveying professionalism and modernity. Supplemental dark tones are provided by Charcoal (#1E1E1E).
- Light Mode Background: A clean, soft off-white (#FAFAF8) for a bright and approachable alternative. Dark text (#1E1E1E) is used for contrast.
- Accent Color: A strong, deep blue (#1A4F8A) used for specific accents, buttons (like 'QR' or 'Sign In'), and to signify trust and official government identity.
- Headings font: 'Syne' (sans-serif), for its distinctive and modern character, providing strong visual impact in titles and key statements. Note: currently only Google Fonts are supported.
- Body text font: 'DM Sans' (sans-serif), chosen for its readability and clean aesthetic across various text densities, complementing the heading font. Note: currently only Google Fonts are supported.
- Functional and modern icons; examples include a sun/moon for theme toggle, map pins, and playful icons for department types. Focus on clarity and visual simplicity across various display sizes.
- Adaptive and intuitive layouts; including Netflix-style horizontal scroll for content discovery, a mobile-first approach for citizen flows, a desktop-first design for consultant views, and highly optimized, touch-friendly layouts for kiosks and TV displays.
- Subtle yet effective animations throughout; such as a Netflix-style loading splash, responsive card/button hover effects, animated queue progress bars, smooth page transitions (fade-in), and attention-grabbing alerts (e.g., lime flash on TV display, modal pop-ups) for critical user notifications.
# FireOne AI - Design Guidelines

## Authentication Architecture
**Auth Required:** Yes - Backend API integration for chat orchestration and RAG retrieval
- **Implementation:** Optional for MVP but hooks must be ready
- Include privacy policy and terms of service links in auth flow
- Minimal permissions approach (App Store & Google Play compliance)
- Privacy-safe analytics events only

## Navigation Architecture
**Pattern:** Stack-Only (single chat interface)
- Single primary screen: Chat interface
- No tab navigation or drawer needed for MVP
- Linear conversation flow with optional threaded chats (future)

## Screen Specifications

### Main Chat Screen
**Purpose:** Primary interface for fire safety compliance Q&A with structured, citation-backed responses

**Header (Non-scrolling, Fixed):**
- FireOne AI logo + wordmark (use provided logo asset)
- Subtitle: "NSW Fire Safety Auditor Copilot" in smaller grey text
- Background: White
- No back button (root screen)
- Top safe area inset: insets.top + Spacing.xl

**Main Content Area:**
- Scrollable chat conversation view
- Background: White
- Safe area insets: top = headerHeight + Spacing.xl, bottom = inputBarHeight + Spacing.xl

**Suggested Prompt Chips (Above Input Bar):**
- Horizontal scrollable row when conversation is empty
- Pre-filled examples: "What is required for an AFSS in NSW?", "What essential measures apply to a Class 2 building?", etc.
- Tappable chips insert text into input field

**Bottom Input Bar (Fixed):**
- Rounded text field with placeholder: "Ask a fire safety compliance question…"
- Send button: Orange paper-plane/arrow icon (FireOne orange accent)
- Background: Subtle warm-grey surface with soft shadow
- Bottom safe area inset: insets.bottom + Spacing.xl

## Design System

### Color Palette
- **Primary Accent:** FireOne Orange (#FF6B35 or equivalent from mockups)
- **Background:** Pure White (#FFFFFF)
- **Surface:** Subtle warm-grey (#F8F8F8 - #FAFAFA range)
- **Text Primary:** Dark grey (#1A1A1A - #2D2D2D)
- **Text Secondary:** Medium grey (#6B6B6B - #8E8E8E)
- **Borders:** Light grey (#E5E5E5 - #EFEFEF)

### Typography
- **Platform Fonts:** SF Pro (iOS) / Inter-like sans-serif (Android)
- **Header Title:** Bold, 18-20pt
- **Subtitle:** Regular, 13-14pt, grey
- **Chat Bubble Text:** Regular, 15-16pt
- **Section Headers (in responses):** Semibold, 14-15pt
- **Timestamps:** Regular, 11-12pt, light grey (optional, off by default)

### Chat Bubble Styling
**User Messages (Left-aligned):**
- Rounded corners (12-16px radius)
- Light grey background (#F5F5F5)
- Soft shadow: shadowOffset {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 2
- Generous padding: 12-16px
- Small circular avatar icon on left

**Assistant Messages (Right/Left-aligned per design):**
- Rounded corners (12-16px radius)
- White background with subtle border OR light accent background
- Soft shadow: shadowOffset {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 2
- Generous padding: 16-20px (more padding for structured content)
- FireOne icon/mark next to bubble

### Message Structure (Assistant Responses)
Every assistant message renders with clear visual hierarchy:
1. **"What this means"** - Plain English summary section
2. **"Relevant references"** - NCC/AS citations with distinct styling (or "No specific code references apply" for non-technical questions)
3. **"Assumptions"** - Bulleted list, subtle background (or "No significant assumptions" if question was clear)
4. **"Next steps"** - Checklist format for auditors (or "No action required" for informational queries)
5. **Disclaimer** - Small text footer: "Not legal advice. Verify against current NCC/standards and local authority requirements."

Note: All sections are always present but contain either substantive content or an explicit "not applicable" statement. This maintains consistent structure while preventing filler content.

### Interactive Elements
- **Prompt Chips:** Rounded pills, white background, grey border, orange on tap
- **Send Button:** Filled orange circle, white icon, subtle shadow on press
- **Long-press Menu:** Copy, Share, Save options with native iOS/Android styling
- **Loading State:** Streaming dots or skeleton text while tokens arrive

### Spacing & Layout
- **Message Spacing:** 12-16px between bubbles
- **Section Spacing (within assistant messages):** 16-20px between structured sections
- **Input Bar Padding:** 12-16px internal padding
- **Screen Margins:** 16-20px horizontal margins for content

### Assets Required
1. **FireOne Logo:** Primary app logo with wordmark (exact from mockups)
2. **FireOne Icon/Mark:** Smaller version for assistant message bubbles
3. **User Avatar:** Generic circular placeholder (grey or initials)
4. **Send Icon:** Orange paper-plane/arrow (use Feather "send" icon styled orange)

### Accessibility
- Minimum touch targets: 44x44pt (iOS HIG compliance)
- Support Dynamic Type for text scaling
- Sufficient color contrast for all text (WCAG AA minimum)
- VoiceOver/TalkBack labels for all interactive elements

### Enterprise & Compliance Considerations
- Professional, regulator-safe aesthetic throughout
- No playful elements or casual language
- Clear visual distinction between user input and authoritative assistant output
- Obvious citation and disclaimer formatting for legal clarity
- Offline state: Clear banner indicating cached content only, send blocked
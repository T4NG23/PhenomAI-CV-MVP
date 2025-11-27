# Phenomitor

An AI-powered interview monitoring system that detects cheating behaviors during remote interviews using real-time computer vision and Google Gemini AI analysis.

**Developed by William Hudson Tang**

## Purpose

Phenomitor helps interviewers maintain interview integrity by:
- Real-time monitoring of webcam streams during interviews
- Detecting suspicious eye movements (reading scripts, looking at notes)
- Identifying physical cheating indicators (devices, notes, other people)
- Audio transcript capture for comprehensive analysis
- 3-strike warning system before alerting interviewer
- Timestamped evidence with detailed behavioral analysis

## Features

### Cheating Detection Categories

1. **Eye Movement Patterns**
   - Horizontal scanning (reading text)
   - Off-screen glances (phone, notes)
   - Looking down at desk/lap
   - Eyes not centered on camera

2. **Physical Indicators**
   - Visible devices (phones, tablets, smartwatches)
   - Notes or paper materials
   - Earbuds/headphones
   - Multiple people in frame
   - Second monitors or screens

3. **Behavioral Patterns**
   - Typing while speaking
   - Unnatural pauses
   - Repeated posture changes
   - Hand movements indicating keyboard use

4. **Audio Analysis**
   - Speech-to-text transcription
   - Visual indicators (hands on keyboard, mouth movements)

### Strike System

- **3-strike threshold** before alert
- Visual strike counter (1/2/3)
- Strike history with timestamps and reasons
- Orange notification popups for strikes 1-2
- Full alert only on 3rd strike
- Continues monitoring after 3 strikes

### Analysis Modes

- **Demo Mode**: 2 requests/second (~$0.03 for 2-min demo)
- **Normal Mode**: 6 requests/minute (40-min sessions on free tier)
- **Conservative Mode**: 3 requests/minute (80-min sessions on free tier)

## Architecture

```
phenomitor/
├── app/                 # Next.js 15 application
│   ├── pages/
│   │   └── realtimeStreamPage/  # Main monitoring interface
│   ├── api/            # API routes
│   └── layout.tsx      # Root layout with particle background
├── components/         # React components
│   ├── ui/            # UI components
│   └── particle-background.tsx
├── lib/               # Utilities
├── public/            # Static assets (logo)
└── utils/             # Helper functions
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your GOOGLE_API_KEY to .env.local

# Run development server
npm run dev

# Open http://localhost:3000/pages/realtimeStreamPage
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS
- **AI Analysis**: Google Gemini 2.5 Flash API
- **Computer Vision**: TensorFlow.js, MediaPipe (face/pose detection)
- **Speech**: Web Speech API (browser-based transcription)
- **Particles**: react-particles with tsparticles
- **Icons**: Lucide React

## Requirements

- Node.js 18+
- Modern web browser with webcam and microphone
- Google Gemini API key (free tier: 15 req/min, 250 req/day)

## Google Gemini API Setup

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key (or use existing project)
3. Create `.env.local` in project root:
   ```
   GOOGLE_API_KEY=your-api-key-here
   GCP_PROJECT_ID=your-project-id
   GCP_PROJECT_NAME=your-project-name
   ```
4. API key should be set to "Don't restrict key" for development

### API Limits (Free Tier)
- **15 requests/minute**
- **250 requests/day**
- Model: `gemini-2.5-flash`

## Usage

1. Navigate to `/pages/realtimeStreamPage`
2. Select analysis mode (Demo/Normal/Conservative)
3. Click "Start Analysis" to begin monitoring
4. System will analyze frames and detect suspicious behaviors
5. Strike counter shows warnings (1/2/3)
6. Alert triggered on 3rd strike
7. Click "Stop Analysis" to end session

## Strike System Behavior

- **Strike 1-2**: Orange notification popup (5 seconds)
- **Strike 3**: Full alert with detailed message
- **Post-Strike**: Continues monitoring and logging
- **Strike History**: Timestamped list of all infractions

## Customization

### Adjust Analysis Interval
Edit `app/pages/realtimeStreamPage/page.tsx`:
```typescript
const intervalTimes = {
  demo: 500,      // milliseconds
  normal: 10000,
  conservative: 20000
}
```

### Modify Detection Prompt
Edit `app/pages/realtimeStreamPage/actions.ts` to customize cheating detection criteria.

### Change Strike Threshold
Search for `currentStrike === 3` in page.tsx to modify alert trigger.

## Project Structure

```
├── app/
│   ├── pages/realtimeStreamPage/
│   │   ├── page.tsx              # Main monitoring UI
│   │   └── actions.ts            # Gemini API integration
│   ├── layout.tsx                 # Root layout with particles
│   └── page.tsx                   # Home page
├── components/
│   ├── particle-background.tsx    # Animated background
│   ├── home-link.tsx              # Logo + nav link
│   └── ui/                        # Shadcn components
├── public/
│   └── phenom-white-optimized.webp # Logo
└── .env.local                     # API keys (not in git)
```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Known Limitations

- **Speech API**: Only transcribes spoken words, not ambient sounds (typing, whispering)
- **Free Tier**: 250 requests/day limit (resets midnight Pacific Time)
- **Detection**: Optimized for sustained patterns (10+ seconds), may miss brief glances
- **Camera Position**: Works best with camera at eye level

## License

See [LICENSE](./LICENSE) file.

## Important Notice

This system is designed to **assist human interviewers**, not replace them. All flagged behaviors should be reviewed by qualified personnel. The system reports observable behaviors only and does not determine intent, guilt, or truthfulness.

---

**Copyright © 2025 William Hudson Tang. All Rights Reserved.**
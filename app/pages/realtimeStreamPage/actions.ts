"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    throw new Error('Missed GOOGLE_API_KEY environment');
}
const genAI = new GoogleGenerativeAI(API_KEY);

export interface VideoEvent {
    timestamp: string;
    description: string;
    isDangerous: boolean;
}

export async function detectEvents(base64Image: string, transcript: string = ''): Promise<{ events: VideoEvent[], rawResponse: string }> {
    console.log('Starting frame analysis...');
    try {
        if (!base64Image) {
            throw new Error("No image data provided");
        }

        const base64Data = base64Image.split(',')[1];
        if (!base64Data) {
            throw new Error("Invalid image data format");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        console.log('Initialized Gemini model');

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
            },
        };

        console.log('Sending image to API...', { imageSize: base64Data.length });
        const prompt = `Analyze this interview video frame for potential cheating or dishonest behavior. Look for these specific indicators:

1. **Eye Movement Patterns:**
   - Reading behavior: Consistent left-to-right eye movements suggesting script reading
   - Repeated glances to same off-screen location (notes, second monitor, phone)
   - Looking down frequently (reading from desk/lap)
   - Looking to the side repeatedly (consulting materials or another person)
   - Unnatural eye patterns that don't match conversation flow
   - Gaze moving in short, repeated loops consistent with scanning text
   - Eyes scanning a bullet list rhythmically
   - Looking from left monitor → center → right monitor in predictable sequence

2. **Gaze Direction Anomalies:**
   - Eyes not focused on camera during responses
   - Systematic shifts away from camera at specific question times
   - Looking up excessively (accessing written materials above screen)
   - Darting eye movements between camera and off-screen locations
   - Quick eye darting right after hearing question (reading AI-generated text)

3. **Audio-Based Cheating Indicators:**
   - Candidate's mouth moving before audio starts (listening to someone else first)
   - Slight delays as they listen before speaking (earpiece coaching)
   - Repeating "Let me think..." while clearly reading
   - Overly robotic, monotone answers suggesting reading

4. **Physical Indicators:**
   - Multiple people visible in frame
   - Person appears to be typing while answering verbal questions
   - Earbuds/headphones visible (potential for coaching)
   - Phone visible in hand or on desk
   - Papers or notes visible in frame
   - Second monitor reflection visible in glasses
   - Touching earbuds to unmute hidden microphone
   - Using smartwatch to scroll for answers
   - Looking down and swiping phone screen off-frame
   - Sticky notes on monitor bezel
   - Mirror placed behind camera
   - Mini whiteboard beside laptop

5. **Behavioral Patterns:**
   - Unnatural pauses before answering (waiting for prompts)
   - Mouth movements not matching audio (if transcript provided)
   - Person looking at keyboard while supposedly listening
   - Sudden posture changes when responding
   - Sudden increase in eye blinking when glancing at reference material
   - Abrupt "freeze" posture while listening to secret coaching
   - Desk vibrations or hand movements suggesting someone else typing

6. **Device Interaction Cheating:**
   - Silent phone notifications lighting up desk or face
   - Frequent tab-switching (reflection visible in glasses)
   - Keyboard shortcuts indicating pasting AI-generated answers
   - Candidate briefly glances at screen with rapidly changing text
   - Alt-tabbing frequently
   - Visible white flashes from documents or searches
   - Cursor moving unnaturally (remote desktop control)

7. **Environmental Red Flags:**
   - Multiple screens visible
   - Another person partially visible in background or shadow on wall
   - Suspicious objects on desk (phone, tablet, notes, book, extra laptop)
   - Candidate positioning suggests viewing off-camera content
   - Strategic camera framing hiding one side of desk
   - Camera angled upward to obscure desk surfaces
   - Sudden changes in room lighting (screen switching)
   - Someone else's presence moving quietly behind camera
   - Small teleprompter above webcam

8. **Timing-Based Cheating:**
   - Long pause before easy questions (waiting for help)
   - Fast answers for complex questions (reading pre-written notes)
   - Inconsistent response pattern: slow → fast → slow → fast

${transcript ? `Audio transcript captured: "${transcript}"

ANALYZE THE VISUAL FRAME for audio-related cheating indicators:
- **Hands on keyboard while speaking**: If you see candidate's hands positioned on keyboard or typing while they should be talking → isDangerous=true
- **Mouth moving but no speech**: Candidate appears to be whispering or mouthing words silently
- **Looking down while hands move**: Indicates typing or writing notes during interview
` : ''}

CRITICAL FLAGGING CRITERIA - FLAG AS isDangerous=true IF YOU SEE:

**STRICT EYE MOVEMENT MONITORING (HIGHEST PRIORITY):**
- **LEFT-TO-RIGHT eye scanning**: ANY horizontal eye movement pattern = READING TEXT → isDangerous=true
  - Even if looking at camera level, if pupils shift left→right = READING FROM SCREEN → isDangerous=true
  - This includes reading from browser tabs, notes on screen, teleprompter
- **Eyes not centered on camera**: If gaze is slightly left, center, or right of camera = reading different parts of screen → isDangerous=true
- **Systematic scanning**: Eyes moving in reading pattern (left→right, return, left→right) = READING → isDangerous=true
- **Pupils tracking across screen**: Any smooth horizontal movement of pupils = READING → isDangerous=true
- **Eyes shifting between screen areas**: Looking at different parts of monitor = consulting multiple sources → isDangerous=true

CRITICAL: If candidate is looking at screen at camera level but eyes move horizontally (even slightly) = READING A SCRIPT on the same screen as the interview window → isDangerous=true

This is EXTREMELY important - many people read scripts positioned next to the camera window. Flag ANY horizontal eye movement.

**Other Red Flags:**
- **Looking down at desk/lap**: Eyes directed downward repeatedly (reading notes below camera)
- **Looking off to the side**: Eyes consistently glancing to left or right side of screen (second monitor or notes beside camera)
- **Device visible**: Phone, tablet, second monitor, smartwatch visible in frame
- **Notes/materials visible**: Papers, sticky notes, books, whiteboard visible on desk or walls
- **Multiple people**: Another person visible in frame or background
- **Typing while answering**: Hands on keyboard during verbal responses
- **Earbuds/headphones**: Wearing audio devices that could receive coaching
- **Not looking at camera**: Eyes consistently avoiding camera while responding
- **Repetitive glance pattern**: Looking at same spot repeatedly (checking reference material)

IGNORE: Camera angle/positioning is normal - DO NOT flag this.

CRITICAL: ANY horizontal eye scanning movement = isDangerous=true. Be EXTREMELY strict about left-to-right eye movements.

If you see ANY of the above patterns (especially horizontal eye movement), SET isDangerous=true IMMEDIATELY.

Return a JSON object in this exact format:

{
    "events": [
        {
            "timestamp": "mm:ss",
            "description": "Brief description of observed behavior",
            "isDangerous": true/false // SET TO TRUE if any of the critical criteria above are met
        }
    ]
}`;

        try {
            const result = await model.generateContent([
                prompt,
                imagePart,
            ]);

            const response = await result.response;
            const text = response.text();
            console.log('Raw API Response:', text);

            // Try to extract JSON from the response, handling potential code blocks
            let jsonStr = text;
            
            // First try to extract content from code blocks if present
            const codeBlockMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
            if (codeBlockMatch) {
                jsonStr = codeBlockMatch[1];
                console.log('Extracted JSON from code block:', jsonStr);
            } else {
                // If no code block, try to find raw JSON
                const jsonMatch = text.match(/\{[^]*\}/);  
                if (jsonMatch) {
                    jsonStr = jsonMatch[0];
                    console.log('Extracted raw JSON:', jsonStr);
                }
            }

            try {
                const parsed = JSON.parse(jsonStr);
                return {
                    events: parsed.events || [],
                    rawResponse: text
                };
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                throw new Error('Failed to parse API response');
            }

        } catch (error) {
            console.error('Error calling API:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error in detectEvents:', error);
        throw error;
    }
}

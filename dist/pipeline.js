"use strict";
// src/pipeline.ts
// Complete 13-Step Sentari Pipeline Implementation
// Team: Vijayasimha (Associate Lead)
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTranscript = processTranscript;
exports.generateMockEntries = generateMockEntries;
exports.resetState = resetState;
exports.simulateFirst = simulateFirst;
exports.simulateHundred = simulateHundred;
const crypto_1 = require("crypto");
// ===== GLOBAL STATE (In-memory storage for demo) =====
let entries = [];
let userProfile = {
    top_themes: [],
    theme_count: {},
    dominant_vibe: '',
    vibe_count: {},
    bucket_count: {},
    trait_pool: [],
    last_theme: ''
};
// ===== UTILITY FUNCTIONS =====
/**
* Logging function with exact required format
*/
function log(tag, input, output, note = '') {
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    console.log(`[${tag}] input=${inputStr} | output=${outputStr} | note=${note}`);
}
/**
 * Create mock 384-dimensional embedding (MiniLM-L6-v2 standard)
 */
function createEmbedding(text) {
    const hash = (0, crypto_1.createHash)('md5').update(text).digest('hex');
    const embedding = [];
    // Generate 384 dimensions (standard MiniLM size)
    for (let i = 0; i < 384; i++) {
        const seed = parseInt(hash.slice(i % 32, (i % 32) + 1), 16);
        embedding.push((Math.sin(seed + i) * 0.5) + (Math.cos(seed * i) * 0.3));
    }
    return embedding;
}
/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }
    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}
// ===== STEP IMPLEMENTATIONS =====
/**
 * Step 05: META_EXTRACT - Extract metadata from text
 */
function extractMetaData(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    // Common words to filter out
    const stopWords = new Set([
        'the', 'and', 'but', 'for', 'are', 'was', 'his', 'her', 'they', 'have',
        'this', 'that', 'with', 'from', 'you', 'she', 'him', 'will', 'been',
        'were', 'their', 'said', 'each', 'which', 'can', 'has', 'had'
    ]);
    // Count word frequencies
    const wordFreq = {};
    words.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (!stopWords.has(cleanWord) && cleanWord.length > 2) {
            wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
    });
    // Get top words
    const topWords = Object.entries(wordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
    // Sentiment indicators
    const sentimentIndicators = [];
    const positiveWords = ['happy', 'good', 'great', 'amazing', 'wonderful', 'excited', 'love'];
    const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated'];
    positiveWords.forEach(word => {
        if (text.toLowerCase().includes(word))
            sentimentIndicators.push(`positive:${word}`);
    });
    negativeWords.forEach(word => {
        if (text.toLowerCase().includes(word))
            sentimentIndicators.push(`negative:${word}`);
    });
    return {
        word_count: words.length,
        char_count: text.length,
        top_words: topWords,
        has_questions: text.includes('?'),
        has_exclamations: text.includes('!'),
        sentiment_indicators: sentimentIndicators
    };
}
/**
 * Step 06: PARSE_ENTRY - Parse themes, vibes, intent, etc.
 */
function parseEntry(text) {
    const lowerText = text.toLowerCase();
    // Extract themes (topics/subjects)
    const themes = [];
    if (lowerText.match(/\b(work|job|office|meeting|boss|colleague|project|deadline|career)\b/)) {
        themes.push('work-life balance');
    }
    if (lowerText.match(/\b(family|mom|dad|parent|sibling|relative|home)\b/)) {
        themes.push('family');
    }
    if (lowerText.match(/\b(health|exercise|doctor|medical|fitness|wellness)\b/)) {
        themes.push('health');
    }
    if (lowerText.match(/\b(friend|social|party|relationship|dating|love)\b/)) {
        themes.push('relationships');
    }
    if (lowerText.match(/\b(money|financial|budget|bills|salary|expenses)\b/)) {
        themes.push('finances');
    }
    if (lowerText.match(/\b(study|learn|school|education|knowledge|skill)\b/)) {
        themes.push('learning');
    }
    if (themes.length === 0)
        themes.push('personal reflection');
    // Extract vibes (emotional states)
    const vibes = [];
    if (lowerText.match(/\b(happy|joy|excited|cheerful|glad|pleased|delighted)\b/)) {
        vibes.push('happy');
    }
    if (lowerText.match(/\b(anxious|worried|nervous|scared|afraid|fearful)\b/)) {
        vibes.push('anxious');
    }
    if (lowerText.match(/\b(tired|exhausted|drained|weary|fatigued)\b/)) {
        vibes.push('exhausted');
    }
    if (lowerText.match(/\b(angry|mad|furious|irritated|annoyed|frustrated)\b/)) {
        vibes.push('frustrated');
    }
    if (lowerText.match(/\b(sad|depressed|down|blue|melancholy|upset)\b/)) {
        vibes.push('sad');
    }
    if (lowerText.match(/\b(calm|peaceful|relaxed|serene|tranquil)\b/)) {
        vibes.push('calm');
    }
    if (lowerText.match(/\b(motivated|driven|determined|ambitious|focused)\b/)) {
        vibes.push('driven');
    }
    if (vibes.length === 0)
        vibes.push('reflective');
    // Extract intent (what the person wants)
    let intent = 'Process thoughts and feelings';
    if (lowerText.match(/\b(need|want|hope|wish|plan)\b/)) {
        if (lowerText.includes('rest') || lowerText.includes('sleep') || lowerText.includes('break')) {
            intent = 'Find rest and recovery';
        }
        else if (lowerText.includes('understand') || lowerText.includes('figure') || lowerText.includes('clarity')) {
            intent = 'Gain understanding and clarity';
        }
        else if (lowerText.includes('improve') || lowerText.includes('better') || lowerText.includes('change')) {
            intent = 'Make positive changes';
        }
        else if (lowerText.includes('help') || lowerText.includes('support')) {
            intent = 'Seek help and support';
        }
    }
    // Extract subtext (hidden meanings)
    let subtext = 'Seeking validation and understanding';
    if (lowerText.includes('but') || lowerText.includes('however') || lowerText.includes('though')) {
        subtext = 'Internal conflict about priorities';
    }
    if (lowerText.includes('scared') || lowerText.includes('afraid') || lowerText.includes('fear')) {
        subtext = 'Fear of failure or missing out';
    }
    if (lowerText.includes('should') || lowerText.includes('supposed to') || lowerText.includes('have to')) {
        subtext = 'Pressure from external expectations';
    }
    // Extract persona traits
    const traits = [];
    if (lowerText.match(/\b(organized|plan|schedule|structure)\b/)) {
        traits.push('organized');
    }
    if (lowerText.match(/\b(help|support|care|nurture)\b/)) {
        traits.push('caring');
    }
    if (lowerText.match(/\b(think|analyze|consider|reflect)\b/)) {
        traits.push('analytical');
    }
    if (lowerText.match(/\b(perfectionist|detail|precise|exact)\b/)) {
        traits.push('perfectionist');
    }
    if (traits.length === 0)
        traits.push('introspective');
    // Determine bucket (entry type)
    const buckets = [];
    if (lowerText.match(/\b(goal|plan|want to|going to|will)\b/)) {
        buckets.push('Goal');
    }
    else if (lowerText.match(/\b(hobby|fun|enjoy|love doing|passion)\b/)) {
        buckets.push('Hobby');
    }
    else if (lowerText.match(/\b(believe|value|important|principle|moral)\b/)) {
        buckets.push('Value');
    }
    else {
        buckets.push('Thought');
    }
    return {
        theme: themes,
        vibe: vibes,
        intent,
        subtext,
        persona_trait: traits,
        bucket: buckets
    };
}
/**
 * Step 09: PROFILE_UPDATE - Update user profile with new entry data
 */
function updateUserProfile(parsed) {
    // Update theme counts
    parsed.theme.forEach(theme => {
        userProfile.theme_count[theme] = (userProfile.theme_count[theme] || 0) + 1;
    });
    // Update vibe counts
    parsed.vibe.forEach(vibe => {
        userProfile.vibe_count[vibe] = (userProfile.vibe_count[vibe] || 0) + 1;
    });
    // Update bucket counts
    parsed.bucket.forEach(bucket => {
        userProfile.bucket_count[bucket] = (userProfile.bucket_count[bucket] || 0) + 1;
    });
    // Update trait pool (avoid duplicates)
    parsed.persona_trait.forEach(trait => {
        if (!userProfile.trait_pool.includes(trait)) {
            userProfile.trait_pool.push(trait);
        }
    });
    // Update top themes (top 4 by frequency)
    userProfile.top_themes = Object.entries(userProfile.theme_count)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([theme]) => theme);
    // Update dominant vibe
    const sortedVibes = Object.entries(userProfile.vibe_count)
        .sort(([, a], [, b]) => b - a);
    if (sortedVibes.length > 0) {
        userProfile.dominant_vibe = sortedVibes[0][0];
    }
    // Update last theme
    if (parsed.theme.length > 0) {
        userProfile.last_theme = parsed.theme[0];
    }
    return userProfile;
}
/**
 * Step 11: GPT_REPLY - Generate empathetic response
 */
function generateEmpathicReply(parsed, isFirstEntry, carryIn) {
    const primaryVibe = parsed.vibe[0] || 'reflective';
    const primaryTheme = parsed.theme[0] || 'general';
    if (isFirstEntry) {
        // First entry responses (more formal, introducing relationship)
        const firstEntryResponses = {
            'happy': "Your joy comes through clearly—what a lovely moment!",
            'anxious': "You're feeling the weight—take it one step at a time.",
            'exhausted': "Sounds like you're drained but trying—rest is not failure.",
            'frustrated': "That frustration is real—you're allowed to feel it.",
            'sad': "I hear the heaviness in your words—you're not alone.",
            'calm': "There's peace in your words—hold onto that feeling.",
            'driven': "Your determination shines through—channel that energy.",
            'reflective': "I hear you processing—your thoughts matter."
        };
        return firstEntryResponses[primaryVibe] || "Thank you for sharing this with me.";
    }
    else {
        // 100th+ entry responses (more personal, using puzzle piece emoji)
        const experiencedResponses = {
            'happy': "🧩 Your energy is infectious—this joy suits you! ✨",
            'anxious': "🧩 Still wrestling with those thoughts, but growth is here 💭",
            'exhausted': "🧩 You're still wired-in, but self-care matters too 💤",
            'frustrated': "🧩 That familiar tension—you're stronger than before 💪",
            'sad': "🧩 The depth in your reflection shows such wisdom 🌊",
            'calm': "🧩 This centered version of you is beautiful to see 🌱",
            'driven': "🧩 Your fire keeps burning bright—I see the focus ⚡",
            'reflective': "🧩 Your depth keeps growing—wisdom building daily 📖"
        };
        let response = experiencedResponses[primaryVibe] || "🧩 Your journey continues to unfold beautifully ✨";
        // Adjust for carry-in (theme continuation)
        if (carryIn) {
            const carryInSuffixes = {
                'work-life balance': " This theme keeps surfacing 🔄",
                'family': " Family remains close to your heart 💕",
                'health': " Your wellness journey continues 🌿",
                'relationships': " Connections matter deeply to you 🤝"
            };
            const suffix = carryInSuffixes[primaryTheme];
            if (suffix && (response.length + suffix.length) <= 55) {
                response = response.replace(/[✨💭💤💪🌊🌱⚡📖]$/, suffix);
            }
        }
        return response;
    }
}
// ===== MAIN 13-STEP PIPELINE =====
/**
 * Main processing function - implements all 13 required steps
 */
async function processTranscript(transcript) {
    const startTime = Date.now();
    // Step 01: RAW_TEXT_IN
    const rawText = transcript.trim();
    log('RAW_TEXT_IN', transcript, rawText, 'Accept and clean transcript');
    // Step 02: EMBEDDING
    const embedding = createEmbedding(rawText);
    log('EMBEDDING', rawText, `[${embedding.length}-dim vector]`, '[MOCK] MiniLM-L6-v2 simulation');
    // Step 03: FETCH_RECENT
    const recent = entries.slice(-5); // Get last 5 entries
    log('FETCH_RECENT', 'last 5 entries', recent.map(e => e.id), `Found ${recent.length} recent entries`);
    // Step 04: FETCH_PROFILE
    const profile = { ...userProfile }; // Copy current profile
    log('FETCH_PROFILE', 'user profile request', profile, `Entries processed: ${entries.length}`);
    // Step 05: META_EXTRACT
    const metaData = extractMetaData(rawText);
    log('META_EXTRACT', rawText, metaData, 'Extracted words, sentiment, punctuation');
    // Step 06: PARSE_ENTRY
    const parsed = parseEntry(rawText);
    log('PARSE_ENTRY', rawText, parsed, '[MOCK] Rule-based parsing with emotion detection');
    // Step 07: CARRY_IN
    let carryIn = false;
    if (recent.length > 0) {
        // Check theme overlap
        const hasThemeOverlap = recent.some(entry => entry.parsed.theme.some(theme => parsed.theme.includes(theme)));
        // Check cosine similarity with most recent entry
        const similarities = recent.map(entry => cosineSimilarity(embedding, entry.embedding));
        const maxSimilarity = Math.max(...similarities);
        carryIn = hasThemeOverlap || maxSimilarity > 0.86;
    }
    log('CARRY_IN', { recent_count: recent.length, themes: parsed.theme }, carryIn, `Theme overlap: ${carryIn ? 'Yes' : 'No'}, Max similarity: ${recent.length > 0 ? Math.max(...recent.map(e => cosineSimilarity(embedding, e.embedding))).toFixed(3) : 'N/A'}`);
    // Step 08: CONTRAST_CHECK
    const emotionFlip = profile.dominant_vibe &&
        parsed.vibe.length > 0 &&
        !parsed.vibe.includes(profile.dominant_vibe) &&
        entries.length > 10; // Only after some history
    log('CONTRAST_CHECK', { dominant: profile.dominant_vibe, current: parsed.vibe }, emotionFlip, `Emotional state differs from dominant pattern: ${emotionFlip ? 'Yes' : 'No'}`);
    // Step 09: PROFILE_UPDATE
    const updatedProfile = updateUserProfile(parsed);
    log('PROFILE_UPDATE', parsed, updatedProfile, 'Updated counts, themes, and dominant patterns');
    // Step 10: SAVE_ENTRY
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEntry = {
        id: entryId,
        raw_text: rawText,
        embedding: embedding,
        parsed: parsed,
        timestamp: new Date()
    };
    entries.push(newEntry);
    log('SAVE_ENTRY', newEntry, entryId, `Saved as entry #${entries.length}`);
    // Step 11: GPT_REPLY
    const isFirstEntry = entries.length === 1;
    const responseText = generateEmpathicReply(parsed, isFirstEntry, carryIn);
    log('GPT_REPLY', { parsed, isFirstEntry, carryIn }, responseText, `[MOCK] Generated ${responseText.length}-char empathic response (≤55 limit)`);
    // Step 12: PUBLISH
    const result = { entryId, response_text: responseText, carry_in: carryIn };
    log('PUBLISH', result, result, 'Packaged final response for client');
    // Step 13: COST_LATENCY_LOG
    const endTime = Date.now();
    const latency = endTime - startTime;
    const mockCost = 0.001; // Mock cost in USD
    log('COST_LATENCY_LOG', { start: startTime, end: endTime }, { latency_ms: latency, cost_usd: mockCost }, `[MOCK] Processing time: ${latency}ms, Estimated cost: $${mockCost}`);
    return result;
}
// ===== SIMULATION FUNCTIONS =====
/**
 * Generate mock entries for testing
 */
function generateMockEntries(count) {
    const mockTranscripts = [
        "I'm feeling really anxious about the presentation tomorrow. I keep going over it in my head but I can't seem to calm down.",
        "Had such a great day with friends today. We went hiking and I felt so connected to nature and everyone around me.",
        "Work has been overwhelming lately. I feel like I'm drowning in tasks and deadlines, and I don't know how to prioritize.",
        "My mom called today and we had a really good conversation about life and family. It made me feel grateful.",
        "I've been thinking about my career goals and where I want to be in five years. It's exciting but also scary.",
        "Feeling grateful for the small moments today. The sunset was absolutely beautiful and it made me pause.",
        "Had a fight with my partner and I'm not sure how to resolve it. Feeling frustrated and misunderstood.",
        "Completed my morning workout and meditation. Starting the day feeling centered and focused.",
        "Been struggling with sleep lately. My mind just won't quiet down at night and I'm exhausted.",
        "Proud of myself for taking on that challenging project at work. Growth feels uncomfortable but good."
    ];
    for (let i = 0; i < count; i++) {
        const transcript = mockTranscripts[i % mockTranscripts.length];
        const variation = ` (Variation ${Math.floor(i / mockTranscripts.length) + 1})`;
        processTranscript(transcript + variation);
    }
}
/**
 * Reset all state for fresh simulation
 */
function resetState() {
    entries.length = 0;
    userProfile = {
        top_themes: [],
        theme_count: {},
        dominant_vibe: '',
        vibe_count: {},
        bucket_count: {},
        trait_pool: [],
        last_theme: ''
    };
}
/**
 * Simulate first entry (no prior history)
 */
async function simulateFirst() {
    console.log('\n=== SIMULATE: FIRST ENTRY ===\n');
    resetState();
    const testTranscript = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";
    const result = await processTranscript(testTranscript);
    console.log('\n📊 FINAL RESULT:');
    console.log(`Entry ID: ${result.entryId}`);
    console.log(`Response: "${result.response_text}" (${result.response_text.length} chars)`);
    console.log(`Carry-in: ${result.carry_in}`);
    console.log('\n=== FIRST ENTRY SIMULATION COMPLETE ===\n');
}
/**
 * Simulate 100th entry (with 99 prior entries)
 */
async function simulateHundred() {
    console.log('\n=== SIMULATE: 100TH ENTRY ===\n');
    resetState();
    console.log('🔄 Generating 99 mock entries...');
    generateMockEntries(99);
    console.log(`✅ Generated ${entries.length} entries. Now processing 100th entry...\n`);
    const testTranscript = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";
    const result = await processTranscript(testTranscript);
    console.log('\n📊 FINAL RESULT:');
    console.log(`Entry ID: ${result.entryId}`);
    console.log(`Response: "${result.response_text}" (${result.response_text.length} chars)`);
    console.log(`Carry-in: ${result.carry_in}`);
    console.log('\n📈 USER PROFILE AFTER 100 ENTRIES:');
    console.log(`Dominant vibe: ${userProfile.dominant_vibe}`);
    console.log(`Top themes: ${userProfile.top_themes.join(', ')}`);
    console.log(`Total entries: ${entries.length}`);
    console.log('\n=== 100TH ENTRY SIMULATION COMPLETE ===\n');
}

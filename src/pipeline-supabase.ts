// src/pipeline-supabase.ts
// Supabase-Integrated 13-Step Sentari Pipeline Implementation
// Team: Sajandeep - Backend Developer

import { createHash } from 'crypto';
import { UserProfileService, DiaryEntryService } from './services/database';

// ===== TYPE DEFINITIONS =====
export interface ParsedEntry {
  theme: string[];
  vibe: string[];
  intent: string;
  subtext: string;
  persona_trait: string[];
  bucket: string[];
}

export interface UserProfile {
  top_themes: string[];
  theme_count: Record<string, number>;
  dominant_vibe: string;
  vibe_count: Record<string, number>;
  bucket_count: Record<string, number>;
  trait_pool: string[];
  last_theme: string;
}

export interface MetaData {
  word_count: number;
  char_count: number;
  top_words: string[];
  has_questions: boolean;
  has_exclamations: boolean;
  sentiment_indicators: string[];
}

// ===== UTILITY FUNCTIONS =====

/**
* Logging function with exact required format
*/
function log(tag: string, input: any, output: any, note: string = ''): void {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
  console.log(`[${tag}] input=${inputStr} | output=${outputStr} | note=${note}`);
}

/**
 * Create mock 384-dimensional embedding (MiniLM-L6-v2 standard)
 */
function createEmbedding(text: string): number[] {
  const hash = createHash('md5').update(text).digest('hex');
  const embedding: number[] = [];

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
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

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
function extractMetaData(text: string): MetaData {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Common words to filter out
  const stopWords = new Set([
    'the', 'and', 'but', 'for', 'are', 'was', 'his', 'her', 'they', 'have',
    'this', 'that', 'with', 'from', 'you', 'she', 'him', 'will', 'been',
    'were', 'their', 'said', 'each', 'which', 'can', 'has', 'had'
  ]);

  // Count word frequencies
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (!stopWords.has(cleanWord) && cleanWord.length > 2) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  });

  // Get top words
  const topWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  // Sentiment indicators
  const sentimentIndicators: string[] = [];
  const positiveWords = ['happy', 'good', 'great', 'amazing', 'wonderful', 'excited', 'love'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated'];

  positiveWords.forEach(word => {
    if (text.toLowerCase().includes(word)) sentimentIndicators.push(`positive:${word}`);
  });

  negativeWords.forEach(word => {
    if (text.toLowerCase().includes(word)) sentimentIndicators.push(`negative:${word}`);
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
function parseEntry(text: string): ParsedEntry {
  const lowerText = text.toLowerCase();

  // Extract themes (topics/subjects)
  const themes: string[] = [];

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
  if (themes.length === 0) themes.push('personal reflection');

  // Extract vibes (emotional states)
  const vibes: string[] = [];

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
  if (lowerText.match(/\b(sad|depressed|down|blue|melancholy|gloomy)\b/)) {
    vibes.push('melancholic');
  }
  if (lowerText.match(/\b(confused|uncertain|unclear|lost|puzzled)\b/)) {
    vibes.push('confused');
  }
  if (lowerText.match(/\b(motivated|determined|driven|focused|inspired)\b/)) {
    vibes.push('motivated');
  }
  if (vibes.length === 0) vibes.push('neutral');

  // Extract intent
  let intent = 'reflection';
  if (lowerText.includes('help') || lowerText.includes('advice') || lowerText.includes('what should')) {
    intent = 'seeking guidance';
  } else if (lowerText.includes('frustrated') || lowerText.includes('angry') || lowerText.includes('upset')) {
    intent = 'venting';
  } else if (lowerText.includes('excited') || lowerText.includes('happy') || lowerText.includes('great')) {
    intent = 'sharing joy';
  } else if (lowerText.includes('worried') || lowerText.includes('anxious') || lowerText.includes('concerned')) {
    intent = 'expressing concern';
  }

  // Extract subtext (deeper meaning)
  let subtext = 'processing daily experience';
  if (themes.includes('work-life balance') && vibes.includes('anxious')) {
    subtext = 'work stress affecting wellbeing';
  } else if (themes.includes('relationships') && vibes.includes('happy')) {
    subtext = 'social connections bringing joy';
  } else if (vibes.includes('exhausted')) {
    subtext = 'seeking rest and recovery';
  } else if (vibes.includes('confused')) {
    subtext = 'navigating uncertainty';
  }

  // Extract persona traits
  const personaTraits: string[] = [];
  if (lowerText.includes('i always') || lowerText.includes('i usually')) {
    personaTraits.push('self-aware');
  }
  if (lowerText.includes('others') || lowerText.includes('people') || lowerText.includes('everyone')) {
    personaTraits.push('socially conscious');
  }
  if (lowerText.includes('should') || lowerText.includes('need to') || lowerText.includes('must')) {
    personaTraits.push('goal-oriented');
  }
  if (lowerText.includes('feel') || lowerText.includes('emotion') || lowerText.includes('heart')) {
    personaTraits.push('emotionally aware');
  }
  if (personaTraits.length === 0) personaTraits.push('reflective');

  // Extract buckets (categorization)
  const buckets: string[] = [];
  if (vibes.includes('anxious') || vibes.includes('frustrated')) {
    buckets.push('stress management');
  }
  if (themes.includes('work-life balance')) {
    buckets.push('career development');
  }
  if (themes.includes('relationships') || themes.includes('family')) {
    buckets.push('social wellness');
  }
  if (themes.includes('health')) {
    buckets.push('physical wellness');
  }
  if (vibes.includes('happy') || vibes.includes('motivated')) {
    buckets.push('personal growth');
  }
  if (buckets.length === 0) buckets.push('general wellness');

  return {
    theme: themes,
    vibe: vibes,
    intent,
    subtext,
    persona_trait: personaTraits,
    bucket: buckets
  };
}

/**
 * Step 08: UPDATE_PROFILE - Update user profile with new entry data
 */
async function updateUserProfile(userId: string, parsed: ParsedEntry): Promise<UserProfile> {
  try {
    // Get existing profile
    let profile = await UserProfileService.getProfile(userId);
    
    if (!profile) {
      // Create new profile if doesn't exist
      const user = await UserProfileService.createProfile(userId, 'user@example.com');
      profile = user;
    }

    // Update theme counts
    const themeCount = { ...profile.theme_count };
    parsed.theme.forEach(theme => {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
    });

    // Update vibe counts
    const vibeCount = { ...profile.vibe_count };
    parsed.vibe.forEach(vibe => {
      vibeCount[vibe] = (vibeCount[vibe] || 0) + 1;
    });

    // Update bucket counts
    const bucketCount = { ...profile.bucket_count };
    parsed.bucket.forEach(bucket => {
      bucketCount[bucket] = (bucketCount[bucket] || 0) + 1;
    });

    // Get top themes (top 3)
    const topThemes = Object.entries(themeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([theme]) => theme);

    // Get dominant vibe (most frequent)
    const dominantVibe = Object.entries(vibeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    // Update trait pool
    const traitPool = [...new Set([...profile.trait_pool, ...parsed.persona_trait])];

    // Update last theme
    const lastTheme = parsed.theme[0] || '';

    const updatedProfile = {
      top_themes: topThemes,
      theme_count: themeCount,
      dominant_vibe: dominantVibe,
      vibe_count: vibeCount,
      bucket_count: bucketCount,
      trait_pool: traitPool,
      last_theme: lastTheme
    };

    // Save to database
    await UserProfileService.updateProfile(userId, updatedProfile);

    return updatedProfile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Step 11: EMPATHIC_REPLY - Generate empathetic response
 */
function generateEmpathicReply(parsed: ParsedEntry, isFirstEntry: boolean, carryIn: boolean, entryCount: number): string {
  log('EMPATHIC_REPLY', { parsed, isFirstEntry, carryIn }, '', 'Generating empathy response');

  const themes = parsed.theme;
  const vibes = parsed.vibe;
  const intent = parsed.intent;

  let response = '';

  // For experienced users (100+ entries), add puzzle piece
  const isExperiencedUser = entryCount >= 100;
  const puzzlePrefix = isExperiencedUser ? '🧩 ' : '';

  // Carry-in responses (when similar themes detected)
  if (carryIn) {
    const carryInResponses = [
      '🌊 I notice this theme surfacing again',
      '🔄 This feels familiar from before',
      '💭 Building on what you shared earlier',
      '🎯 You keep circling back to this',
      '🔗 I see the connection to yesterday'
    ];
    response = carryInResponses[Math.floor(Math.random() * carryInResponses.length)];
  }
  // First entry responses
  else if (isFirstEntry) {
    if (vibes.includes('happy') || vibes.includes('excited')) {
      const joyResponses = [
        '✨ What lovely energy you bring today!',
        '🌟 Your joy shines through beautifully',
        '💫 I can feel your positive spirit',
        '🌸 Such beautiful emotions to share',
        '🎉 Your happiness is contagious!'
      ];
      response = joyResponses[Math.floor(Math.random() * joyResponses.length)];
    } else if (vibes.includes('anxious') || vibes.includes('frustrated')) {
      const supportResponses = [
        '🤗 I hear the weight you\'re carrying',
        '💝 You\'re not alone in this feeling',
        '🌙 Take a gentle breath with me',
        '🕊️ Let\'s sit with this together',
        '💙 I understand this feels heavy'
      ];
      response = supportResponses[Math.floor(Math.random() * supportResponses.length)];
    } else if (themes.includes('work-life balance')) {
      const workResponses = [
        '⚖️ Work-life balance is so important',
        '🎯 Career thoughts deserve attention',
        '💼 Professional growth matters deeply',
        '🌱 Building your path mindfully',
        '🔮 Your career journey is unique'
      ];
      response = workResponses[Math.floor(Math.random() * workResponses.length)];
    } else {
      const generalResponses = [
        '🌿 Thank you for sharing with me',
        '💚 I appreciate your openness',
        '🌺 Your thoughts matter deeply',
        '🦋 Grateful you\'re here today',
        '🌞 What a gift to hear from you'
      ];
      response = generalResponses[Math.floor(Math.random() * generalResponses.length)];
    }
  }
  // Experienced user responses
  else {
    if (vibes.includes('happy') || vibes.includes('motivated')) {
      const experiencedJoyResponses = [
        '🌈 Your growth journey amazes me',
        '⭐ You\'ve come so far in this space',
        '🎨 I love seeing your evolution',
        '🚀 Your progress is inspiring',
        '🌻 You\'re blooming beautifully'
      ];
      response = experiencedJoyResponses[Math.floor(Math.random() * experiencedJoyResponses.length)];
    } else if (vibes.includes('anxious') || vibes.includes('exhausted')) {
      const experiencedSupportResponses = [
        '🧘 Remember your inner strength',
        '💪 You\'ve weathered storms before',
        '🌊 Riding these waves together',
        '🎯 Trust your resilient spirit',
        '💎 Pressure creates diamonds'
      ];
      response = experiencedSupportResponses[Math.floor(Math.random() * experiencedSupportResponses.length)];
    } else if (themes.includes('relationships') || themes.includes('family')) {
      const relationshipResponses = [
        '💕 Connections shape our hearts',
        '🤝 Relationships are life\'s gifts',
        '💞 Love in all its forms heals',
        '🌟 You nurture beautiful bonds',
        '🏡 Home is where the heart grows'
      ];
      response = relationshipResponses[Math.floor(Math.random() * relationshipResponses.length)];
    } else {
      const experiencedGeneralResponses = [
        '🌙 Your wisdom deepens each day',
        '🔥 I admire your continued courage',
        '🌊 Flowing through life\'s chapters',
        '💫 Your journey inspires me daily',
        '🎭 Each story you share matters'
      ];
      response = experiencedGeneralResponses[Math.floor(Math.random() * experiencedGeneralResponses.length)];
    }
  }

  // Add puzzle piece prefix for experienced users
  response = puzzlePrefix + response;

  // Ensure response is within character limit
  if (response.length > 55) {
    response = response.substring(0, 52) + '...';
  }

  log('EMPATHIC_REPLY', { parsed, carryIn }, response, `${response.length} chars`);
  return response;
}

/**
 * Main processing function with Supabase integration
 */
export async function processTranscriptWithSupabase(
  transcript: string,
  userId: string
): Promise<{
  entryId: string;
  response_text: string;
  carry_in: boolean;
}> {
  try {
    console.log('🧩 Starting Supabase-integrated pipeline processing...');

    // Step 1: Generate embedding
    const embedding = createEmbedding(transcript);
    log('EMBEDDING', transcript, `[${embedding.slice(0, 3).map(n => n.toFixed(3)).join(', ')}...]`, '384-dim vector created');

    // Step 2: Extract metadata
    const metadata = extractMetaData(transcript);
    log('META_EXTRACT', transcript, metadata, 'Metadata extracted');

    // Step 3: Parse entry
    const parsed = parseEntry(transcript);
    log('PARSE_ENTRY', transcript, parsed, 'Entry parsed');

    // Step 4: Check for carry-in using database
    let carryIn = false;
    let maxSimilarity = 0;

    try {
      const similarEntries = await DiaryEntryService.findSimilarEntries(userId, embedding, 0.86, 5);
      
      if (similarEntries.length > 0) {
        // Calculate similarities with existing entries
        for (const entry of similarEntries) {
          const similarity = cosineSimilarity(embedding, entry.embedding);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }
        }
        
        carryIn = maxSimilarity >= 0.86;
      }
    } catch (error) {
      console.warn('⚠️ Similarity search failed, checking theme overlap instead');
      
      // Fallback: Check recent entries for theme overlap
      const recentEntries = await DiaryEntryService.getUserEntries(userId, 10);
      const recentThemes = recentEntries.flatMap(entry => entry.parsed_themes);
      const hasThemeOverlap = parsed.theme.some(theme => recentThemes.includes(theme));
      carryIn = hasThemeOverlap;
    }

    log('CARRY_IN_DETECT', { embedding: `[${embedding.slice(0, 3).join(', ')}...]` }, 
        { carry_in: carryIn, similarity: maxSimilarity }, 
        `Threshold: 0.86, Found: ${maxSimilarity.toFixed(3)}`);

    // Step 5: Update user profile
    await updateUserProfile(userId, parsed);
    log('UPDATE_PROFILE', parsed, 'profile updated', 'User profile synchronized');

    // Step 6: Get entry count for response generation
    const entryCount = await UserProfileService.getEntryCount(userId);
    const isFirstEntry = entryCount === 0;

    // Step 7: Generate empathetic response
    const responseText = generateEmpathicReply(parsed, isFirstEntry, carryIn, entryCount);

    // Step 8: Store entry in database
    const diaryEntry = await DiaryEntryService.createEntry(
      userId,
      transcript,
      embedding,
      parsed,
      metadata,
      carryIn,
      carryIn ? maxSimilarity : undefined,
      responseText
    );

    log('STORE_ENTRY', transcript, diaryEntry.id, 'Entry stored in Supabase');

    console.log('✅ Pipeline processing completed successfully');

    return {
      entryId: diaryEntry.id,
      response_text: responseText,
      carry_in: carryIn
    };

  } catch (error) {
    console.error('❌ Pipeline processing error:', error);
    throw error;
  }
} 
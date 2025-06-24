// tests/pipeline.test.ts
// Comprehensive test suite for Sentari Pipeline
// Team: Vijayasimha (Associate Lead)

import { describe, it, expect, beforeEach } from '@jest/globals';
import { processTranscript, resetState, generateMockEntries } from '../src/pipeline';

describe('Sentari Pipeline Tests', () => {
  // Reset state before each test
  beforeEach(() => {
    resetState();
  });

  describe('Basic Pipeline Functionality', () => {
    it('should process first entry correctly', async () => {
      const transcript = "I'm feeling anxious about work today.";
      const result = await processTranscript(transcript);

      expect(result.entryId).toBeDefined();
      expect(typeof result.entryId).toBe('string');
      expect(result.response_text).toBeDefined();
      expect(result.response_text.length).toBeLessThanOrEqual(55);
      expect(result.carry_in).toBe(false); // First entry should not have carry-in
    });

    it('should generate responses within character limit', async () => {
      const transcripts = [
        "I'm so happy today!",
        "Feeling overwhelmed with work deadlines and stress.",
        "Had a wonderful conversation with my family.",
        "Struggling with anxiety and can't sleep well."
      ];

      for (const transcript of transcripts) {
        const result = await processTranscript(transcript);
        expect(result.response_text.length).toBeLessThanOrEqual(55);
        expect(result.response_text.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty or very short transcripts', async () => {
      const result = await processTranscript("Hi.");

      expect(result.entryId).toBeDefined();
      expect(result.response_text).toBeDefined();
      expect(result.response_text.length).toBeLessThanOrEqual(55);
    });
  });

  describe('Carry-in Logic', () => {
    it('should detect carry-in for similar themes', async () => {
      // First entry about work
      await processTranscript("I'm stressed about my job and deadlines at the office.");

      // Second entry about work (should detect carry-in)
      const result = await processTranscript("Work is overwhelming me again today.");

      expect(result.carry_in).toBe(true);
    });

    it('should not detect carry-in for different themes', async () => {
      // First entry about work
      await processTranscript("I'm stressed about my job and deadlines.");

      // Second entry about family (different theme)
      const result = await processTranscript("Had a wonderful dinner with my family tonight.");

      expect(result.carry_in).toBe(false);
    });

    it('should detect carry-in based on embedding similarity', async () => {
      // Very similar emotional content should trigger carry-in
      await processTranscript("I keep checking Slack when I'm exhausted.");
      const result = await processTranscript("I keep checking work messages when I'm tired.");

      // Should detect similarity even if exact themes don't match
      expect(result.carry_in).toBe(true);
    });
  });

  describe('Response Evolution', () => {
    it('should give different responses for first vs experienced user', async () => {
      // First entry response
      const firstResult = await processTranscript("I'm feeling anxious about work.");
      const firstResponse = firstResult.response_text;

      // Generate 99 entries to simulate experienced user
      generateMockEntries(99);

      // 100th entry response
      const hundredthResult = await processTranscript("I'm feeling anxious about work.");
      const hundredthResponse = hundredthResult.response_text;

      // Responses should be different
      expect(firstResponse).not.toBe(hundredthResponse);

      // 100th entry should include puzzle piece emoji (🧩)
      expect(hundredthResponse).toContain('🧩');
    });

    it('should not include puzzle piece in first entries', async () => {
      const result = await processTranscript("I'm feeling stressed about everything.");

      expect(result.response_text).not.toContain('🧩');
    });
  });

  describe('Emotion Detection', () => {
    it('should detect positive emotions', async () => {
      const result = await processTranscript("I'm so happy and excited about life today!");

      // Response should reflect positive emotion
      expect(result.response_text.toLowerCase()).toMatch(/(joy|lovely|energy|beautiful)/);
    });

    it('should detect negative emotions', async () => {
      const result = await processTranscript("I'm feeling really sad and depressed today.");

      // Response should be empathetic to negative emotion
      expect(result.response_text.toLowerCase()).toMatch(/(hear|understand|not alone|depth)/);
    });

    it('should detect work-related stress', async () => {
      const result = await processTranscript("Work deadlines are making me so anxious and overwhelmed.");

      // Should detect work theme and anxious vibe
      expect(result.response_text.toLowerCase()).toMatch(/(weight|tension|step|time|rest)/);
    });
  });

  describe('Profile Building', () => {
    it('should build profile over multiple entries', async () => {
      // Add multiple work-related entries
      await processTranscript("Stressed about work deadlines.");
      await processTranscript("Another busy day at the office.");
      await processTranscript("Project presentation went well.");

      // Add family entry
      await processTranscript("Great family dinner tonight.");

      // The next work entry should show carry-in due to theme history
      const result = await processTranscript("Feeling overwhelmed with work again.");

      expect(result.carry_in).toBe(true);
    });

    it('should handle mixed emotional states', async () => {
      // Add entries with different emotions
      await processTranscript("So happy about my promotion!");
      await processTranscript("Feeling anxious about new responsibilities.");
      await processTranscript("Excited but nervous about the future.");

      const result = await processTranscript("Mixed feelings about everything.");

      expect(result.entryId).toBeDefined();
      expect(result.response_text.length).toBeLessThanOrEqual(55);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long transcripts', async () => {
      const longTranscript = "I've been thinking a lot about my life lately and where I'm heading. ".repeat(20);
      const result = await processTranscript(longTranscript);

      expect(result.entryId).toBeDefined();
      expect(result.response_text.length).toBeLessThanOrEqual(55);
    });

    it('should handle transcripts with special characters', async () => {
      const transcript = "Feeling 😊 happy today!!! 🎉 But also worried... 😔";
      const result = await processTranscript(transcript);

      expect(result.entryId).toBeDefined();
      expect(result.response_text.length).toBeLessThanOrEqual(55);
    });

    it('should handle repeated processing of same transcript', async () => {
      const transcript = "I'm feeling stressed about work.";

      const result1 = await processTranscript(transcript);
      const result2 = await processTranscript(transcript);

      // Should generate different entry IDs
      expect(result1.entryId).not.toBe(result2.entryId);

      // Second entry should detect carry-in
      expect(result2.carry_in).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should process entries within time limit', async () => {
      const startTime = Date.now();

      await processTranscript("Testing processing speed and performance.");

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process within 3 seconds (3000ms)
      expect(processingTime).toBeLessThan(3000);
    });

    it('should handle multiple rapid entries', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(processTranscript(`Entry number ${i + 1} for stress testing.`));
      }

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.entryId).toBeDefined();
        expect(result.response_text.length).toBeLessThanOrEqual(55);
      });
    });
  });

  describe('Integration with Mock Generation', () => {
    it('should work with generated mock entries', async () => {
      generateMockEntries(10);

      const result = await processTranscript("Testing after mock generation.");

      expect(result.entryId).toBeDefined();
      expect(result.carry_in).toBeDefined(); // May or may not be true
    });

    it('should maintain state across mock generation', async () => {
      generateMockEntries(50);

      // Should show experienced user response patterns
      const result = await processTranscript("I'm feeling anxious today.");

      // With 50+ entries, should be experienced user
      expect(result.response_text).toContain('🧩');
    });
  });

  describe('Data Validation', () => {
    it('should return well-formed result objects', async () => {
      const result = await processTranscript("Testing data validation.");

      // Check required fields exist
      expect(result).toHaveProperty('entryId');
      expect(result).toHaveProperty('response_text');
      expect(result).toHaveProperty('carry_in');

      // Check types
      expect(typeof result.entryId).toBe('string');
      expect(typeof result.response_text).toBe('string');
      expect(typeof result.carry_in).toBe('boolean');
    });

    it('should generate unique entry IDs', async () => {
      const result1 = await processTranscript("First entry.");
      const result2 = await processTranscript("Second entry.");
      const result3 = await processTranscript("Third entry.");

      const ids = [result1.entryId, result2.entryId, result3.entryId];
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3); // All IDs should be unique
    });
  });

  describe('Reset Functionality', () => {
    it('should properly reset state', async () => {
      // Add some entries
      await processTranscript("First entry before reset.");
      await processTranscript("Second entry before reset.");

      // Reset state
      resetState();

      // Next entry should behave like first entry
      const result = await processTranscript("Entry after reset.");

      expect(result.carry_in).toBe(false);
      expect(result.response_text).not.toContain('🧩'); // Should be first-entry response
    });
  });
});

// Additional helper tests for specific functions
describe('Utility Functions', () => {
  describe('Mock Generation', () => {
    it('should generate specified number of mock entries', () => {
      resetState();
      generateMockEntries(25);

      // Check that entries were generated (indirectly through behavior)
      // We can't directly access entries array, so we test the effect
      const result = processTranscript("Testing after mock generation.");
      expect(result).resolves.toBeDefined();
    });

    it('should handle zero mock entries', () => {
      resetState();
      generateMockEntries(0);

      // Should work without issues
      const result = processTranscript("Testing with zero mocks.");
      expect(result).resolves.toBeDefined();
    });
  });
});

// Simulation-specific tests
describe('Simulation Commands', () => {
  it('should handle first entry simulation', async () => {
    resetState();

    const testTranscript = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";
    const result = await processTranscript(testTranscript);

    expect(result.entryId).toBeDefined();
    expect(result.response_text.length).toBeLessThanOrEqual(55);
    expect(result.carry_in).toBe(false); // First entry
    expect(result.response_text).not.toContain('🧩'); // First entry format
  });

  it('should handle 100th entry simulation', async () => {
    resetState();
    generateMockEntries(99);

    const testTranscript = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";
    const result = await processTranscript(testTranscript);

    expect(result.entryId).toBeDefined();
    expect(result.response_text.length).toBeLessThanOrEqual(55);
    expect(result.response_text).toContain('🧩'); // Experienced user format
  });
});

// Performance and stress tests
describe('Performance Tests', () => {
  it('should maintain performance with large entry history', async () => {
    resetState();
    generateMockEntries(200); // Large history

    const startTime = Date.now();
    await processTranscript("Performance test with large history.");
    const endTime = Date.now();

    const processingTime = endTime - startTime;
    expect(processingTime).toBeLessThan(5000); // Should still be under 5 seconds
  });

  it('should handle concurrent processing requests', async () => {
    resetState();

    const concurrentPromises = Array.from({ length: 10 }, (_, i) =>
      processTranscript(`Concurrent entry ${i + 1}`)
    );

    const results = await Promise.all(concurrentPromises);

    // All should complete successfully
    expect(results).toHaveLength(10);
    results.forEach((result, index) => {
      expect(result.entryId).toBeDefined();
      expect(result.response_text.length).toBeLessThanOrEqual(55);
    });

    // All entry IDs should be unique
    const entryIds = results.map(r => r.entryId);
    const uniqueIds = new Set(entryIds);
    expect(uniqueIds.size).toBe(10);
  });
});

// Theme and emotion detection specific tests
describe('Advanced NLP Features', () => {
  it('should detect work-life balance themes', async () => {
    const workTranscripts = [
      "Overwhelmed with deadlines at the office today.",
      "Boss is pushing too hard and I'm exhausted.",
      "Love my job but need better work-life balance.",
      "Meeting after meeting, when do I get actual work done?"
    ];

    for (const transcript of workTranscripts) {
      const result = await processTranscript(transcript);
      expect(result.response_text.toLowerCase()).toMatch(/(work|balance|rest|time|step)/);
    }
  });

  it('should detect family and relationship themes', async () => {
    const familyTranscripts = [
      "Had dinner with my parents tonight.",
      "My sister called and we talked for hours.",
      "Worried about my mom's health lately.",
      "Family gathering was chaotic but fun."
    ];

    for (const transcript of familyTranscripts) {
      const result = await processTranscript(transcript);
      expect(result.response_text.toLowerCase()).toMatch(/(family|heart|connection|love|care)/);
    }
  });

  it('should adapt responses to emotional intensity', async () => {
    // High intensity
    const intense = await processTranscript("I'm absolutely devastated and can't stop crying!");

    // Low intensity
    const mild = await processTranscript("Feeling a bit down today.");

    // Responses should be different (though we can't test exact content)
    expect(intense.response_text).not.toBe(mild.response_text);
    expect(intense.response_text.length).toBeLessThanOrEqual(55);
    expect(mild.response_text.length).toBeLessThanOrEqual(55);
  });
});

// Error handling and robustness tests
describe('Error Handling', () => {
  it('should handle malformed input gracefully', async () => {
    const malformedInputs = [
      "", // Empty string
      "   ", // Only whitespace
      "\n\n\n", // Only newlines
      "🎉🎉🎉", // Only emojis
      "123456789", // Only numbers
    ];

    for (const input of malformedInputs) {
      const result = await processTranscript(input);
      expect(result.entryId).toBeDefined();
      expect(result.response_text).toBeDefined();
      expect(result.response_text.length).toBeLessThanOrEqual(55);
    }
  });

  it('should handle extremely long input', async () => {
    const longInput = "This is a very long transcript. ".repeat(1000); // ~33,000 characters

    const result = await processTranscript(longInput);
    expect(result.entryId).toBeDefined();
    expect(result.response_text.length).toBeLessThanOrEqual(55);
  });

  it('should handle special characters and unicode', async () => {
    const unicodeInput = "Feeling émotionnel today 🌟 with lots of café ☕ and naïve thoughts 思考 about life";

    const result = await processTranscript(unicodeInput);
    expect(result.entryId).toBeDefined();
    expect(result.response_text.length).toBeLessThanOrEqual(55);
  });
});

// Integration test for complete workflow
describe('Complete Workflow Integration', () => {
  it('should complete full user journey', async () => {
    resetState();

    // Simulate a user's journey over time
    const userJourney = [
      "Starting a new job tomorrow, feeling excited but nervous.",
      "First day went well, colleagues seem friendly.",
      "Getting overwhelmed with all the new information.",
      "Had my first project meeting, feeling more confident.",
      "Deadline stress is getting to me, working late.",
      "Completed my first major project successfully!",
      "Boss gave positive feedback, feeling validated.",
      "Thinking about work-life balance more seriously.",
      "Started setting boundaries with work hours.",
      "Much happier with my job situation now."
    ];

    const results = [];
    for (const entry of userJourney) {
      const result = await processTranscript(entry);
      results.push(result);
    }

    // All should succeed
    expect(results).toHaveLength(10);

    // Should show progression (later entries might have carry-in)
    const hasCarryIn = results.some(r => r.carry_in);
    expect(hasCarryIn).toBe(true);

    // All responses should be within limit
    results.forEach(result => {
      expect(result.response_text.length).toBeLessThanOrEqual(55);
    });

    // Entry IDs should all be unique
    const entryIds = results.map(r => r.entryId);
    const uniqueIds = new Set(entryIds);
    expect(uniqueIds.size).toBe(10);
  });
});
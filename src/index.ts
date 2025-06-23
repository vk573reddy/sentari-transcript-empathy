// src/index.ts
import { simulateFirst, simulateHundred } from './pipeline';

console.log('🧩 Sentari Transcript to Empathy Pipeline');
console.log('Team: Vijayasimha (Associate Lead)');
console.log('Project Status: Setting up...\n');

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'first':
    simulateFirst();
    break;
  case 'hundred':
    simulateHundred();
    break;
  default:
    console.log('Usage: npm run dev [first|hundred]');
    console.log('Or use: npm run simulate:first or npm run simulate:hundred');
}
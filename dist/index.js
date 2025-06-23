"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const pipeline_1 = require("./pipeline");
console.log('🧩 Sentari Transcript to Empathy Pipeline');
console.log('Team: Vijayasimha (Associate Lead)');
console.log('Project Status: Setting up...\n');
// CLI interface
const command = process.argv[2];
switch (command) {
    case 'first':
        (0, pipeline_1.simulateFirst)();
        break;
    case 'hundred':
        (0, pipeline_1.simulateHundred)();
        break;
    default:
        console.log('Usage: npm run dev [first|hundred]');
        console.log('Or use: npm run simulate:first or npm run simulate:hundred');
}

// src/server.ts
// Web UI Server for Sentari Pipeline
// Team: Vijayasimha (Associate Lead)

import express from 'express';
import cors from 'cors';
import { processTranscript, resetState, generateMockEntries, simulateFirst, simulateHundred } from './pipeline';

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function for error handling
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Global variables to capture logs
let pipelineLogs: string[] = [];
let isCapturingLogs = false;

// Override console.log to capture pipeline logs
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  const message = args.join(' ');

  // Capture logs that match our pipeline format
  if (isCapturingLogs && message.includes('[') && message.includes(']')) {
    pipelineLogs.push(message);
  }

  // Always call original console.log
  originalConsoleLog(...args);
};

// Main UI route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🧩 Sentari - Transcript to Empathy Pipeline</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
                color: #333;
            }

            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                overflow: hidden;
            }

            .header {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                padding: 30px;
                text-align: center;
                color: white;
            }

            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }

            .header p {
                font-size: 1.2rem;
                opacity: 0.9;
            }

            .main-content {
                padding: 30px;
            }

            .input-section {
                background: #f8f9fa;
                padding: 25px;
                border-radius: 10px;
                margin-bottom: 30px;
                border-left: 5px solid #4facfe;
            }

            .input-section h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.4rem;
            }

            textarea {
                width: 100%;
                height: 120px;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                font-family: inherit;
                resize: vertical;
                transition: border-color 0.3s ease;
            }

            textarea:focus {
                outline: none;
                border-color: #4facfe;
                box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
            }

            .button-group {
                display: flex;
                gap: 15px;
                margin-top: 20px;
                flex-wrap: wrap;
            }

            button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 150px;
            }

            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }

            button:active {
                transform: translateY(0);
            }

            button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .btn-primary {
                background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            }

            .btn-secondary {
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            }

            .btn-danger {
                background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            }

            .result-section {
                background: #e8f5e8;
                border: 2px solid #28a745;
                border-radius: 10px;
                padding: 25px;
                margin: 20px 0;
                display: none;
            }

            .result-section.show {
                display: block;
                animation: slideIn 0.5s ease;
            }

            @keyframes slideIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .response-text {
                font-size: 1.4rem;
                color: #155724;
                font-weight: bold;
                background: white;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #28a745;
                margin: 15px 0;
            }

            .metadata {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }

            .metadata-item {
                background: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }

            .metadata-label {
                font-weight: bold;
                color: #666;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .metadata-value {
                font-size: 1.2rem;
                color: #2c3e50;
                margin-top: 5px;
            }

            .logs-section {
                background: #2c3e50;
                border-radius: 10px;
                padding: 20px;
                margin-top: 30px;
            }

            .logs-header {
                color: white;
                font-size: 1.3rem;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .logs-container {
                background: #34495e;
                border-radius: 8px;
                padding: 15px;
                max-height: 400px;
                overflow-y: auto;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.6;
            }

            .log-entry {
                color: #ecf0f1;
                margin: 5px 0;
                padding: 5px;
                border-radius: 3px;
                transition: background-color 0.2s ease;
            }

            .log-entry:hover {
                background-color: rgba(255,255,255,0.1);
            }

            .log-tag {
                color: #3498db;
                font-weight: bold;
            }

            .loading {
                display: none;
                text-align: center;
                padding: 20px;
            }

            .loading.show {
                display: block;
            }

            .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }

            .stat-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }

            .stat-number {
                font-size: 2rem;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .stat-label {
                font-size: 1rem;
                opacity: 0.9;
            }

            .footer {
                background: #2c3e50;
                color: white;
                text-align: center;
                padding: 20px;
                margin-top: 40px;
            }

            @media (max-width: 768px) {
                .header h1 {
                    font-size: 2rem;
                }

                .button-group {
                    flex-direction: column;
                }

                button {
                    min-width: auto;
                }

                .metadata {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🧩 Sentari Pipeline</h1>
                <p>Transcript to Empathy - 13-Step Processing System</p>
            </div>

            <div class="main-content">
                <div class="input-section">
                    <h3>📝 Enter Your Diary Transcript</h3>
                    <textarea
                        id="transcript"
                        placeholder="Share your thoughts, feelings, or experiences here... The AI will analyze your emotional state and provide an empathetic response."
                    >I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.</textarea>

                    <div class="button-group">
                        <button onclick="processEntry()" class="btn-primary">
                            🔄 Process Entry
                        </button>
                        <button onclick="simulateFirst()" class="btn-secondary">
                            🥇 Simulate First Entry
                        </button>
                        <button onclick="simulateHundred()" class="btn-secondary">
                            💯 Simulate 100th Entry
                        </button>
                        <button onclick="resetData()" class="btn-danger">
                            🔄 Reset Data
                        </button>
                    </div>
                </div>

                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    <p>Processing through 13-step pipeline...</p>
                </div>

                <div class="result-section" id="result">
                    <h3>🤖 AI Empathetic Response</h3>
                    <div class="response-text" id="response">
                        Response will appear here...
                    </div>

                    <div class="metadata">
                        <div class="metadata-item">
                            <div class="metadata-label">Entry ID</div>
                            <div class="metadata-value" id="entryId">-</div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Carry-in Detected</div>
                            <div class="metadata-value" id="carryIn">-</div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Response Length</div>
                            <div class="metadata-value" id="responseLength">-</div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Processing Time</div>
                            <div class="metadata-value" id="processingTime">-</div>
                        </div>
                    </div>
                </div>

                <div class="logs-section">
                    <div class="logs-header">
                        📊 Pipeline Execution Logs (13 Steps)
                    </div>
                    <div class="logs-container" id="logs">
                        <div style="color: #95a5a6; text-align: center; padding: 20px;">
                            No logs yet. Process an entry to see the 13-step pipeline execution.
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>Sentari Group Interview Project | Team: Vijayasimha (Associate Lead)</p>
                <p>Deadline: Thursday June 26, 11:59pm ET | Demo: Friday</p>
            </div>
        </div>

        <script>
            let processingStartTime = 0;

            async function processEntry() {
                const transcript = document.getElementById('transcript').value;
                if (!transcript.trim()) {
                    alert('Please enter a transcript to process');
                    return;
                }

                showLoading(true);
                processingStartTime = Date.now();

                try {
                    const response = await fetch('/api/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transcript })
                    });

                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }

                    const data = await response.json();
                    displayResult(data.result, data.logs);
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error processing transcript: ' + error.message);
                } finally {
                    showLoading(false);
                }
            }

            async function simulateFirst() {
                showLoading(true);
                processingStartTime = Date.now();

                try {
                    const response = await fetch('/api/simulate/first');
                    const data = await response.json();
                    displayResult(data.result, data.logs);

                    // Update textarea with the test transcript
                    document.getElementById('transcript').value = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error in first entry simulation: ' + error.message);
                } finally {
                    showLoading(false);
                }
            }

            async function simulateHundred() {
                showLoading(true);
                processingStartTime = Date.now();

                try {
                    const response = await fetch('/api/simulate/hundred');
                    const data = await response.json();
                    displayResult(data.result, data.logs);

                    // Update textarea with the test transcript
                    document.getElementById('transcript').value = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error in 100th entry simulation: ' + error.message);
                } finally {
                    showLoading(false);
                }
            }

            async function resetData() {
                if (!confirm('Are you sure you want to reset all data? This will clear all entries and profile data.')) {
                    return;
                }

                try {
                    const response = await fetch('/api/reset', { method: 'POST' });
                    if (response.ok) {
                        alert('Data reset successfully');
                        document.getElementById('result').classList.remove('show');
                        document.getElementById('logs').innerHTML = \`
                            <div style="color: #95a5a6; text-align: center; padding: 20px;">
                                Data reset complete. Process an entry to see the 13-step pipeline execution.
                            </div>
                        \`;
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error resetting data: ' + error.message);
                }
            }

            function showLoading(show) {
                const loading = document.getElementById('loading');
                const buttons = document.querySelectorAll('button');

                if (show) {
                    loading.classList.add('show');
                    buttons.forEach(btn => btn.disabled = true);
                } else {
                    loading.classList.remove('show');
                    buttons.forEach(btn => btn.disabled = false);
                }
            }

            function displayResult(result, logs) {
                const processingTime = Date.now() - processingStartTime;

                // Display main result
                document.getElementById('response').textContent = result.response_text;
                document.getElementById('entryId').textContent = result.entryId;
                document.getElementById('carryIn').textContent = result.carry_in ? '✅ Yes' : '❌ No';
                document.getElementById('responseLength').textContent = \`\${result.response_text.length}/55 chars\`;
                document.getElementById('processingTime').textContent = \`\${processingTime}ms\`;

                // Show result section
                document.getElementById('result').classList.add('show');

                // Display logs
                displayLogs(logs);

                // Scroll to results
                document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
            }

            function displayLogs(logs) {
                const logsContainer = document.getElementById('logs');

                if (!logs || logs.length === 0) {
                    logsContainer.innerHTML = \`
                        <div style="color: #e74c3c; text-align: center; padding: 20px;">
                            No logs captured. Check console for debugging.
                        </div>
                    \`;
                    return;
                }

                const logHtml = logs.map((log, index) => {
                    const tagMatch = log.match(/\\[(\\w+)\\]/);
                    const tag = tagMatch ? tagMatch[1] : 'UNKNOWN';

                    return \`
                        <div class="log-entry">
                            <span style="color: #95a5a6;">\${String(index + 1).padStart(2, '0')}.</span>
                            <span class="log-tag">[\${tag}]</span>
                            <span style="color: #ecf0f1;">\${log.replace(/\\[\\w+\\]/, '').trim()}</span>
                        </div>
                    \`;
                }).join('');

                logsContainer.innerHTML = logHtml;

                // Scroll to bottom of logs
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }

            // Auto-resize textarea
            document.getElementById('transcript').addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.max(120, this.scrollHeight) + 'px';
            });
        </script>
    </body>
    </html>
  `);
});

// API Routes
app.post('/api/process', async (req, res) => {
  try {
    pipelineLogs = [];
    isCapturingLogs = true;

    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const result = await processTranscript(transcript);

    isCapturingLogs = false;

    res.json({
      result,
      logs: pipelineLogs.slice() // Send copy of logs
    });
  } catch (error) {
    isCapturingLogs = false;
    console.error('Error processing transcript:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.get('/api/simulate/first', async (req, res) => {
  try {
    pipelineLogs = [];
    isCapturingLogs = true;

    // Capture simulation logs
    const originalLog = console.log;
    let simulationLogs: string[] = [];

    console.log = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('[') && message.includes(']')) {
        simulationLogs.push(message);
      }
      originalLog(...args);
    };

    await simulateFirst();

    console.log = originalLog;
    isCapturingLogs = false;

    // Extract the final result from the last processed entry
    const testTranscript = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";
    resetState();

    pipelineLogs = [];
    isCapturingLogs = true;
    const result = await processTranscript(testTranscript);
    isCapturingLogs = false;

    res.json({
      result,
      logs: pipelineLogs.slice()
    });
  } catch (error) {
    isCapturingLogs = false;
    console.error('Error in first simulation:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.get('/api/simulate/hundred', async (req, res) => {
  try {
    pipelineLogs = [];
    isCapturingLogs = true;

    resetState();
    generateMockEntries(99);

    const testTranscript = "I keep checking Slack even when I'm exhausted. I know I need rest, but I'm scared I'll miss something important.";

    pipelineLogs = [];
    isCapturingLogs = true;
    const result = await processTranscript(testTranscript);
    isCapturingLogs = false;

    res.json({
      result,
      logs: pipelineLogs.slice()
    });
  } catch (error) {
    isCapturingLogs = false;
    console.error('Error in hundred simulation:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    resetState();
    pipelineLogs = [];
    res.json({ success: true, message: 'All data reset successfully' });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Sentari Server running at http://localhost:${PORT}`);
  console.log('📊 Ready for transcript processing!');
  console.log('🎯 Demo ready - all 13 pipeline steps implemented\n');
});

export default app;
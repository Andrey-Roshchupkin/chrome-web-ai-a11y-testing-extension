# Accessibility AI Analyzer

A Chrome extension that uses AI-powered analysis to test web accessibility and generate comprehensive WCAG 2.1 compliance reports. The extension combines automated testing (axe-core), DOM analysis, screenshot analysis via vision-language models, and AI-generated contextual recommendations.

> **Note**: Chrome Web Store link coming soon. For now, please install from source using the instructions below.  
> Click the **Watch** button (👁️) at the top of this repository to receive notifications about releases and updates, including when the extension becomes available in the Chrome Web Store. 

## Overview

Accessibility AI Analyzer performs multi-stage accessibility analysis:

1. **Screenshot Analysis** - Uses AI vision models to identify UI elements and their properties from screenshots
2. **DOM Analysis** - Analyzes the page's DOM structure for semantic HTML, ARIA attributes, and accessibility issues
3. **Color Analysis** - Runs automated WCAG contrast checks using axe-core and AI vision analysis
4. **Element Matching** - Matches screenshot elements with DOM elements to identify mismatches and missing accessible names
5. **AI Recommendations** - Generates contextual, prioritized recommendations based on all analysis results

## Installation

### Prerequisites

- **Chrome 139+** (required for Google Web AI support)
- Node.js and npm (for building from source)

### Setup

1. **Enable Chrome Flags** (for Google Web AI):
   - Open Chrome and navigate to `chrome://flags/`
   - Enable the following flags:
     - `#prompt-api-for-gemini-nano`
     - `#prompt-api-for-gemini-nano-multimodal-input`
   - Restart Chrome

2. **Build the Extension**:
   ```bash
   npm install
   npm run build
   ```

3. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `build` folder from this project

4. **Verify Installation**:
   - The extension icon should appear in your Chrome toolbar
   - Click the icon to open the analysis window

## Usage

### Using Google Web AI (Recommended)

Google Web AI is built into Chrome 139+ and requires no additional setup:

1. Click the extension icon
2. Ensure "Google Web AI (built into Chrome)" is selected
3. Navigate to the webpage you want to analyze
4. Click "🔍 Analyze" in the extension window
5. Wait for the analysis to complete (typically 10-30 seconds)
6. Review the results in the extension window

**Recommended Models**: Google Web AI uses Gemini Nano, which supports both text and image inputs. This is the default and recommended option as it requires no external setup.

### Using Ollama

For local AI analysis using Ollama:

1. **Install and Start Ollama**:
   ```bash
   # Install Ollama (if not already installed)
   # Visit https://ollama.ai for installation instructions
   
   # Start Ollama server with CORS enabled
   export OLLAMA_ORIGINS=chrome-extension://*
   ollama serve
   ```

2. **Pull a Vision Model**:
   ```bash
   # Recommended models that support vision (text + images):
   ollama pull gemma3:12b        # Google Gemma 3 12B (tested and recommended)
   ollama pull gemma3:4b         # Google Gemma 3 4B (smaller, faster)
   ollama pull gemma3:27b        # Google Gemma 3 27B (larger, more accurate)
   ```

3. **Configure the Extension**:
   - Click the extension icon
   - Select "Ollama (local server)"
   - Enter your Ollama API URL (default: `http://localhost:11434`)
   - Enter the model name (e.g., `gemma3:12b`)
   - Click "🔍 Analyze"

## Analysis Process

The extension performs a comprehensive 5-stage analysis:

### Stage 1: Screenshot Analysis

**What it does**: Uses AI vision models to analyze a screenshot of the webpage and identify visible UI elements.

**Technologies**: 
- Google Web AI (Gemini Nano) or Ollama vision models
- AI vision-language models that can process images

**What it detects**:
- Interactive elements (buttons, links, inputs)
- Text content and headings
- Visual structure and layout
- Element positions and relationships

**Output**: List of UI elements with their types, text content, and approximate positions.

### Stage 2: DOM Analysis

**What it does**: Analyzes the actual DOM structure of the webpage for semantic HTML and accessibility attributes.

**Technologies**: 
- Native DOM API
- Custom semantic analysis algorithms

**What it detects**:
- Generic elements (`<div>`, `<span>`) used as interactive components
- Missing semantic HTML (e.g., `<div>` instead of `<button>`)
- ARIA attributes and their usage
- Missing accessible names (alt text, aria-label, text content)
- Links without valid href attributes
- Images without alt text
- Buttons without accessible names

**WCAG Criteria Checked**:
- **1.1.1 Non-text Content** - Images missing alt text
- **2.4.4 Link Purpose (In Context)** - Links without valid href or accessible names
- **4.1.2 Name, Role, Value** - Missing accessible names, generic elements
- **2.1.1 Keyboard** - Generic elements missing keyboard support
- **1.3.1 Info and Relationships** - Semantic structure issues
- **2.4.6 Headings and Labels** - Missing or improper labels

**Output**: List of DOM elements with accessibility issues, ARIA attributes, and semantic recommendations.

### Stage 3: Color Analysis

**What it does**: Analyzes color contrast and accessibility using both automated tools and AI vision.

**Technologies**: 
- **axe-core** - Automated WCAG compliance testing
- **AI Vision Analysis** - Visual contrast detection from screenshots

**What it detects**:
- Insufficient color contrast ratios (text vs background)
- Color-only indicators (information conveyed only through color)
- Focus indicator visibility issues
- Low contrast for interactive elements

**WCAG Criteria Checked**:
- **1.4.3 Contrast (Minimum)** - AA level contrast (4.5:1 for normal text, 3:1 for large text)
- **1.4.6 Contrast (Enhanced)** - AAA level contrast (7:1 for normal text, 4.5:1 for large text)
- **1.4.1 Use of Color** - Information not conveyed through color alone
- **2.4.7 Focus Visible** - Keyboard focus indicators

**Output**: List of color contrast issues with severity levels, affected elements, and WCAG criteria.

### Stage 4: Element Matching

**What it does**: Matches elements identified in the screenshot with DOM elements to identify discrepancies and missing accessible names.

**Technologies**: 
- Custom matching algorithms
- Position-based and text-based matching

**What it detects**:
- Screenshot elements that don't match any DOM element (potential missing semantic HTML)
- DOM elements that don't appear in screenshot (off-screen or hidden elements)
- Elements with visible text in screenshot but missing accessible names in DOM
- Mismatches between visual appearance and DOM structure

**Output**: 
- Matched pairs (screenshot element ↔ DOM element)
- Unmatched screenshot elements (potential issues)
- Unmatched DOM elements (may indicate problems)

### Stage 5: AI Recommendations

**What it does**: Generates contextual, prioritized accessibility recommendations by combining all analysis results.

**Technologies**: 
- AI language models (Google Web AI or Ollama)
- Structured recommendation engine

**What it generates**:
- Prioritized recommendations (Critical, High, Medium, Low)
- Categorized by type (semantic, ARIA, contrast, keyboard, label, other)
- Specific fixes with code examples
- WCAG criteria mapping
- Affected elements identification

**Output**: Comprehensive accessibility report with:
- Summary statistics (total issues, by priority, by WCAG level)
- Structured recommendations with titles, descriptions, and fixes
- WCAG criteria mapping
- Affected elements

## WCAG 2.1 Coverage

### Checked Criteria

The extension checks the following WCAG 2.1 criteria:

**Level A**:
- **1.1.1 Non-text Content** - Images must have alt text or aria-label
- **2.1.1 Keyboard** - All functionality must be keyboard accessible
- **2.4.4 Link Purpose (In Context)** - Links must have clear purpose
- **4.1.2 Name, Role, Value** - UI components must have accessible names and roles

**Level AA**:
- **1.4.3 Contrast (Minimum)** - Text contrast ratio of at least 4.5:1 (3:1 for large text)
- **1.4.1 Use of Color** - Information not conveyed through color alone
- **2.4.6 Headings and Labels** - Headings and labels must be descriptive
- **2.4.7 Focus Visible** - Keyboard focus must be visible

**Level AAA** (partial):
- **1.4.6 Contrast (Enhanced)** - Enhanced contrast ratios (7:1 for normal text)
- **1.3.1 Info and Relationships** - Semantic structure and relationships

### Not Currently Checked

The following WCAG criteria are **not** automatically checked by this extension:

**Level A**:
- 1.3.2 Meaningful Sequence
- 1.3.3 Sensory Characteristics
- 1.4.2 Audio Control
- 2.1.2 No Keyboard Trap
- 2.2.1 Timing Adjustable
- 2.2.2 Pause, Stop, Hide
- 2.3.1 Three Flashes or Below Threshold
- 2.4.1 Bypass Blocks
- 2.4.2 Page Titled
- 2.4.3 Focus Order
- 2.5.1 Pointer Gestures
- 2.5.2 Pointer Cancellation
- 2.5.3 Label in Name
- 2.5.4 Motion Actuation
- 3.1.1 Language of Page
- 3.2.1 On Focus
- 3.2.2 On Input
- 3.3.1 Error Identification
- 3.3.2 Labels or Instructions
- 3.3.3 Error Suggestion
- 3.3.4 Error Prevention (Legal, Financial, Data)
- 4.1.1 Parsing
- 4.1.3 Status Messages

**Level AA**:
- 1.4.4 Resize Text
- 1.4.5 Images of Text
- 1.4.10 Reflow
- 1.4.11 Non-text Contrast
- 1.4.12 Text Spacing
- 1.4.13 Content on Hover or Focus
- 2.4.5 Multiple Ways
- 2.4.8 Location
- 2.5.1 Pointer Gestures
- 2.5.2 Pointer Cancellation
- 2.5.3 Label in Name
- 2.5.4 Motion Actuation
- 3.1.2 Language of Parts
- 3.2.3 Consistent Navigation
- 3.2.4 Consistent Identification
- 3.3.1 Error Identification
- 3.3.2 Labels or Instructions
- 3.3.3 Error Suggestion

**Level AAA** (most not checked):
- Most Level AAA criteria require manual testing or specialized tools

## Features

- **Multi-stage Analysis**: Combines screenshot, DOM, color, and matching analysis
- **AI-Powered**: Uses vision-language models for intelligent element detection
- **Automated Testing**: Integrates axe-core for WCAG compliance checks
- **Contextual Recommendations**: AI-generated, prioritized fixes with code examples
- **WCAG Mapping**: Maps all issues to specific WCAG 2.1 criteria
- **Export Results**: Copy results as formatted text or raw JSON
- **Real-time Analysis**: Analyzes the current active tab

## Development

### Building

```bash
npm install
npm run build
```

## Project Structure

```
src/
├── background.ts          # Service worker, orchestrates analysis
├── window.ts              # UI logic for the extension window
├── window.html            # UI markup
├── window.css             # UI styles
├── content.ts             # Content script (injects axe-core)
├── core/
│   ├── index.ts           # Main AccessibilityAIAnalyzer class
│   ├── api/
│   │   ├── googleWebAIClient.ts    # Google Web AI client
│   │   └── externalApiClient.ts   # Ollama client
│   ├── analyzers/
│   │   ├── screenshotAnalyzer.ts  # AI screenshot analysis
│   │   ├── domAnalyzer.ts         # DOM structure analysis
│   │   ├── colorAnalyzer.ts       # Color contrast analysis (axe-core)
│   │   ├── elementMatcher.ts      # Screenshot-DOM matching
│   │   └── recommendationEngine.ts # AI recommendation generation
│   └── types.ts           # TypeScript type definitions
└── shared/
    ├── types.ts           # Shared type definitions
    └── uiHelpers.ts       # UI helper functions
```

## License

MIT

## Author

Andrew Roshchupkin


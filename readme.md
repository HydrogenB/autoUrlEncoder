# MyDebugger Tools Platform

A comprehensive collection of web-based developer tools, designed to streamline your workflow. Built for developers, testers, and marketers with a focus on usability and privacy.

## Features

- **Client-side Processing**: All tools run directly in your browser. Your data never leaves your device.
- **History & Saved Items**: Automatically save your work and access your history.
- **Developer Focused**: Built by developers for developers.
- **Mobile Friendly**: All tools are fully responsive and work on mobile devices.

## Available Tools

- **URL Parameter Encoder**: Encode URL parameters for deep links, marketing campaigns, and secure data sharing.
- **JSON Formatter** (Coming Soon): Format, validate and beautify JSON data.
- **Base64 Converter** (Coming Soon): Encode and decode Base64 strings.

## Project Structure

```
mydebugger/
├── index.html                   # Main landing page
├── tools/
│   └── url-encoder.html         # URL Parameter Encoder tool
├── css/
│   ├── main.css                 # Global styles
│   └── tools/
│       └── url-encoder.css      # Tool-specific styles
├── js/
│   ├── common.js                # Common functionality (header, footer)
│   ├── storage.js               # Shared storage API
│   ├── tools-registry.js        # Tool registration system
│   └── tools/
│       └── url-encoder.js       # Tool-specific logic
├── assets/
│   ├── favicon.png              # Site favicon
│   └── icons/                   # Icon resources
└── vercel.json                  # Vercel deployment config
```

## Architecture

MyDebugger uses a modular architecture that allows for easy addition of new tools:

1. **Tool Registry**: A central registry that manages all available tools
2. **Shared Storage API**: Common storage interface for tool data persistence
3. **Common Components**: Reusable UI components and utilities
4. **Analytics Integration**: Anonymous usage tracking for improving tools

## Local Development

1. Clone the repository:
   ```
   git clone https://github.com/HydrogenB/mydebugger.git
   ```

2. Serve the project using any static file server:
   ```
   npx serve
   ```

3. Open your browser at `http://localhost:5000`

## Adding a New Tool

1. Create tool HTML file in the `tools/` directory
2. Create tool CSS file in the `css/tools/` directory
3. Create tool JavaScript file in the `js/tools/` directory
4. Register the tool in `js/tools-registry.js`

## Deployment

The project is configured for deployment with Vercel. Simply push to your GitHub repository and connect it to Vercel.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

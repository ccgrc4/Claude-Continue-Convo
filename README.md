# 🤖 Claude Chat Formatter

A simple, fast web app that formats Claude.ai conversations for easy sharing and copying into new chats.

## 🎯 Problem It Solves

When you share a Claude.ai conversation via share link (e.g., `https://claude.ai/share/...`), you can't paste that link directly into a new Claude chat for review. You have to manually copy, format, and distinguish between speakers.

This app automates that process!

## ✨ Features

- 📋 **Easy Copy-Paste**: Just copy your conversation and paste it in
- 🏷️ **Smart Formatting**: Automatically labels messages with "Darko:" and "Claude:"
- 📱 **Mobile-Friendly**: Works perfectly on iPhone, iPad, and desktop
- ⚡ **Fast & Simple**: No sign-up, no server, just pure client-side magic
- 🎨 **Clean Design**: Beautiful, modern UI with responsive design
- 🌙 **Dark Mode**: Automatically adapts to your system preferences
- 📦 **One-Click Copy**: Copy formatted conversation to clipboard instantly

## 🚀 How to Use

1. Visit your Claude.ai share link in your browser
2. Select all (Cmd+A / Ctrl+A) and copy the conversation
3. Paste it into the text box on this app
4. Click "Format Conversation"
5. Click "Copy to Clipboard"
6. Paste into a new Claude chat!

## 📦 Quick Deploy

### Option 1: Deploy to Netlify (Recommended)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

**Manual Netlify Deployment:**

1. Fork or clone this repository
2. Go to [netlify.com](https://www.netlify.com)
3. Sign up / Log in (free account)
4. Click "Add new site" → "Import an existing project"
5. Connect your GitHub account
6. Select this repository
7. Click "Deploy site"
8. Done! Your site will be live at `https://your-site-name.netlify.app`

**Custom Domain (Optional):**
- In Netlify dashboard: Site settings → Domain management → Add custom domain

### Option 2: Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**Manual Vercel Deployment:**

1. Fork or clone this repository
2. Go to [vercel.com](https://vercel.com)
3. Sign up / Log in (free account)
4. Click "New Project"
5. Import your GitHub repository
6. Click "Deploy"
7. Done! Your site will be live at `https://your-site-name.vercel.app`

### Option 3: Deploy to GitHub Pages

1. Fork this repository
2. Go to repository Settings → Pages
3. Under "Source", select "Deploy from a branch"
4. Select `main` branch and `/ (root)` folder
5. Click "Save"
6. Your site will be live at `https://your-username.github.io/Claude-Continue-Convo`

### Option 4: Deploy to Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Sign up / Log in (free account)
3. Click "Create a project"
4. Connect to GitHub and select this repository
5. Build settings:
   - Build command: (leave empty)
   - Build output directory: `/`
6. Click "Save and Deploy"

## 🛠️ Local Development

Want to run it locally? Super easy:

```bash
# Clone the repository
git clone https://github.com/yourusername/Claude-Continue-Convo.git
cd Claude-Continue-Convo

# Open in browser (no build step needed!)
# Option 1: Just open index.html in your browser
open index.html

# Option 2: Use a local server (recommended for testing)
python3 -m http.server 8000
# Then visit: http://localhost:8000

# Or use Node.js:
npx http-server
```

## 📁 Project Structure

```
Claude-Continue-Convo/
├── index.html          # Main HTML structure
├── styles.css          # Responsive CSS styling
├── app.js              # Conversation parsing & formatting logic
├── netlify.toml        # Netlify configuration
├── vercel.json         # Vercel configuration
├── README.md           # This file
└── .gitignore         # Git ignore rules
```

## 🎨 Features in Detail

### Smart Parsing
The app intelligently detects message boundaries even if the conversation doesn't have explicit labels. It uses multiple strategies:
- Detects existing speaker labels
- Splits by paragraph boundaries
- Uses heuristics for unlabeled conversations
- Handles edge cases gracefully

### Copy to Clipboard
One-click copying with visual feedback:
- Modern Clipboard API for security
- Fallback for older browsers
- Visual confirmation when copied
- Works on all devices (desktop & mobile)

### Responsive Design
Optimized for all screen sizes:
- Desktop: Full-featured layout
- Tablet: Adaptive design
- Mobile: Touch-friendly, optimized inputs
- iPhone: Native feel, no zoom issues

## 🔧 Customization

Want to change the speaker labels from "Darko:" to your name?

1. Open `app.js`
2. Find the line: `const speaker = msg.speaker || (index % 2 === 0 ? 'Darko' : 'Claude');`
3. Replace `'Darko'` with your name
4. Redeploy!

## 🤝 Contributing

Found a bug? Have a feature request?

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 💡 Tips & Tricks

- **Bookmark It**: Add to your home screen on iPhone for quick access
- **Keyboard Shortcut**: Use Cmd/Ctrl + Enter in the text box to format
- **Dark Mode**: The app automatically adapts to your system theme
- **Privacy First**: Everything runs in your browser - no data is sent to any server

## 🔗 Links

- **Live Demo**: [Your deployed URL here]
- **GitHub**: https://github.com/yourusername/Claude-Continue-Convo
- **Issues**: https://github.com/yourusername/Claude-Continue-Convo/issues

## ❤️ Made With

- Pure HTML, CSS, and JavaScript
- No frameworks or dependencies
- Optimized for performance and accessibility
- Built with love for easier Claude conversations

---

**Enjoy formatting your Claude conversations!** 🎉

If you find this useful, give it a ⭐ on GitHub!

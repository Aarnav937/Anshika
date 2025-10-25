# 🌟 A.N.S.H.I.K.A.

**Built with a dream ✨**

A powerful AI assistant with dual-mode support (online & offline), document intelligence, image generation, and voice features.

---

## ✨ Features

- 🤖 **Dual AI Mode**: Switch between Gemini (online) and Ollama (offline)
- 💬 **Smart Chat**: Casual Indian-style personality with sarcasm & humor
- 📄 **Document Intelligence**: Upload PDFs, images, extract text with OCR
- 🎨 **Image Generation**: Create images using Gemini AI
- 🔊 **Text-to-Speech**: Hear responses with Gemini TTS
- 🛠️ **AI Tools**: Weather, web search, tasks, reminders, date/time
- 🎭 **Personality**: Casual, sarcastic, Indian slang, short responses
- 🌐 **No Memory**: Fresh start every session (privacy-focused)

---

## 🚀 Quick Start

### 1. **Clone the Repository**
```bash
git clone https://github.com/Aarnav937/skynet-codes.git
cd skynet-codes
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Add Your API Keys**
1. Start the app (step 4)
2. Click the **🔑 API Keys** button in the top right
3. Add your **Gemini API Key** (required)
   - Get it free: https://aistudio.google.com/app/apikey
4. (Optional) Add Weather API key from https://www.weatherapi.com/

### 4. **Run the App**
```bash
npm run dev
```

Open **http://localhost:3000** in your browser!

---

## 🔑 Getting API Keys

### **Gemini API (Required)**
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click **"Get API Key"** → **"Create API Key"**
4. Copy the key
5. In Anshika, click 🔑 → Paste key → Save

**Free tier includes:**
- 15 requests per minute
- 1,500 requests per day
- Enough for personal use!

### **Weather API (Optional)**
1. Go to https://www.weatherapi.com/
2. Sign up free
3. Copy your API key
4. Add it in Anshika's API Keys panel

---

## 📖 How to Use

### **Chat with AI**
- Type your message and press Enter
- Tools are enabled by default (weather, tasks, etc.)
- Click 🔊 icon to hear responses (TTS)

### **Switch Modes**
- **Online Mode**: Uses Gemini AI (requires internet & API key)
- **Offline Mode**: Uses Ollama (requires Ollama installed locally)

### **Upload Documents**
1. Click **Document Intelligence** tab on left sidebar
2. Upload PDF, image, or text file
3. Ask questions about your document

### **Generate Images**
1. Click **Image Generation** tab
2. Enter a prompt (e.g., "a sunset over mountains")
3. Click Generate

---

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **AI**: Google Gemini API, Ollama (optional)
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB (client-side)
- **TTS**: Gemini Text-to-Speech

---

## ⚙️ Configuration

### **Change Personality**
Edit `src/config/personalityConfig.ts` to adjust:
- Sarcasm level
- Humor frequency
- Formality
- Indian slang usage

### **Disable Tools**
Click the "🔍 Tools Enabled" button to toggle AI tools on/off

### **Adjust Temperature**
Use the temperature slider to control response creativity:
- Lower (0.3): More focused & precise
- Higher (1.0): More creative & random

---

## 🔒 Privacy & Security

- ✅ **No data sent to our servers** - Everything runs in your browser
- ✅ **API keys encrypted** - Stored securely in browser using Web Crypto API
- ✅ **No memory system** - Conversations don't persist (privacy-first)
- ✅ **Offline mode available** - Use Ollama for complete privacy

---

## 📦 Build for Production

```bash
npm run build
```

Output will be in `dist/` folder. Deploy to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag & drop `dist` folder
- **GitHub Pages**: Push `dist` to `gh-pages` branch

---

## 🐛 Troubleshooting

### **"API key not found"**
- Click 🔑 button and add your Gemini API key
- Make sure you saved it (click "Save Key")

### **TTS not working**
- Check if Gemini API key is valid
- Try shorter messages (very long text takes time)
- Wait 5-10 seconds for audio to generate

### **Offline mode not working**
- Install Ollama: https://ollama.ai/
- Run: `ollama pull gemma3:4b`
- Make sure Ollama is running

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📄 License

MIT License - Feel free to use, modify, and distribute!

---

## 💬 Anshika's Personality

Yo! I'm Anshika - your chill AI buddy with Indian vibes. I talk casual, crack jokes, use sarcasm, and keep things real. No fake corporate-speak here yaar! 😊

Ask me anything, and I'll give you short, helpful answers with a bit of sass. Let's get stuff done! 🚀

---

## 🌟 Credits

Built with a dream by **Aarnav** ✨

---

**Star ⭐ this repo if you found it helpful!**

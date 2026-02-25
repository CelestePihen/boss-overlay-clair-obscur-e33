# 🌍 Contributing Translations

Thank you for your interest in translating Boss Overlay! This guide explains how to contribute translations easily - no technical knowledge required!

## 📋 Before You Start

**Currently supported languages:**

- 🇫🇷 **French** (complete)
- 🇬🇧 **English** (complete)

**Want to add a new language?** Great! Just follow the steps below or open an [Issue](../../issues) to discuss it first.

---

## 🚀 How to Submit Your Translation

### Step 1️⃣: Get the Template File

**Download one of these files to use as your starting point:**

- **[en.json](./src/i18n/locales/en.json)** - English reference (to see what needs translating)
- **[fr.json](./src/i18n/locales/fr.json)** - French original (for context)

💡 **Tip:** There is a 'Download raw file' button at the top-right.

### Step 2️⃣: Edit the File

Open the file with any text editor: Notepad, Notepad++, VS Code, Sublime Text, Vim, ...

**What to translate:**

- Change the text on the **right side** (after the `:`)
- Keep everything else unchanged (keys, brackets, emojis, placeholders)

### Step 3️⃣: Validate Your JSON

Before submitting, make sure your JSON is valid:

1. Go to **[JSONLint](https://jsonlint.com/)**
2. Copy your entire file content
3. Paste it and click **"Validate"**
4. Fix any errors it finds (usually missing/extra commas or quotes)

### Step 4️⃣: Submit via GitHub Issue

1. **Go to [New Issue](../../issues/new/choose)**
2. **Select "Translation Contribution"**
3. **Fill out the form:**
   - Select your language
   - Check what you translated (interface, zones, categories, boss names)
   - Paste your complete JSON file in the text area
   - Add any notes or questions
4. **Click "Submit new issue"**
5. **Done!** I'll review and add it to the project 🎉

---

## 💬 Need Help?

**Common Questions:**

**Q: I'm not sure how to translate a specific term**  
A: Add a note in the issue explaining your concern. I can help!

**Q: Can I submit a partial translation?**  
A: Absolutely! Translate what you can, submit it, and you can always improve it later.

**Q: I found a typo in the original French/English text**  
A: Great! Mention it in your issue or open a separate bug report.

**Q: My JSON validator shows an error**  
A: Common fixes:

- Missing comma after a line (except the last line in a section)
- Extra comma on the last line of a section
- Unescaped quote inside text (use `\"` instead of `"`)
- Missing closing bracket `}` or brace `]`

**Still stuck?**

- 🐛 Open an [Issue](../../issues) with your question
- 💬 Start a [Discussion](../../discussions)
- ✉️ Post on the [NexusMods](https://www.nexusmods.com/clairobscurexpedition33/mods/707?tab=posts) page
- 📧 Tag me in your translation issue

---

## ✨ Thank You!

Your contribution helps players worldwide enjoy Boss Overlay in their native language! 🙏

**After your translation is merged, you'll be credited:**

- 📝 README.md credits section
- 💬 Release notes
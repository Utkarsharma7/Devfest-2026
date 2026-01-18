# Setup Guide - Devfest-2026

Complete guide to set up and run the LinkedIn scraper application with GitHub matching.

## Prerequisites

- Python 3.8+ installed
- Node.js and npm installed
- Windows Subsystem for Linux (WSL) installed and configured
- Ollama installed (either on Windows or WSL)
- Git installed

---

## Step 1: Create LinkedIn Session

**Important:** You need to create a LinkedIn session file before running the application. This allows the scraper to authenticate with LinkedIn.

### Steps to Create LinkedIn Session:

1. **Navigate to the LinkedIn Scraper directory:**
   ```cmd
   cd linkedin_scraper
   ```

2. **Install dependencies (if not already installed):**
   ```cmd
   pip install -r requirements.txt
   ```

3. **Install the linkedin_scraper package:**
   ```cmd
   pip install -e .
   ```
   Or alternatively:
   ```cmd
   python setup.py install
   ```
   This installs the `linkedin_scraper` package so it can be imported by scripts.

4. **Run the session creator script:**
   ```cmd
   python samples/create_session.py
   ```

5. **What happens:**
   - A browser window will open automatically
   - You'll be taken to LinkedIn's login page
   - **Log in manually** with your LinkedIn credentials
   - Complete any 2FA or CAPTCHA challenges
   - Wait for your LinkedIn feed to load
   - The script will automatically detect when login is complete
   - Your session will be saved to `linkedin_session.json` in the `linkedin_scraper` directory

6. **Important Notes:**
   - You have **5 minutes** to complete the login
   - Keep the `linkedin_session.json` file secure (it contains your authentication cookies)
   - **Never commit** this file to git (it should already be in `.gitignore`)
   - If the session expires later, you'll need to run this script again

### Troubleshooting:
- If login fails, make sure you complete the login within 5 minutes
- Ensure your LinkedIn feed loads completely before the timeout
- If you see authentication errors, try creating a new session

---

## Step 2: Install All Dependencies

### Python Dependencies:

1. **LinkedIn Scraper:**
   ```cmd
   cd linkedin_scraper
   pip install -r requirements.txt
   cd ..
   ```

2. **LLM Scripts:**
   ```cmd
   cd llm-scripts
   pip install -r requirements.txt
   cd ..
   ```

3. **GitHub Matcher:**
   ```cmd
   cd llmGitHub
   pip install -r requirements.txt
   cd ..
   ```

### Node.js Dependencies:

1. **Frontend (Root):**
   ```cmd
   npm install
   ```

2. **Frontend (my-app):**
   ```cmd
   cd my-app
   npm install
   cd ..
   ```

---

## Step 3: Start All Servers

**The easiest way:** Use the `start_all.bat` script which starts everything automatically.

### Using start_all.bat:

**Important:** Make sure you're in the **project root directory** (Devfest-2026) when running this script.

1. **Double-click `start_all.bat`** in the project root directory, OR

2. **Run from Windows Command Prompt or PowerShell:**
   ```cmd
   cd C:\Users\utkar\OneDrive\Desktop\Devfest-2026
   start_all.bat
   ```
   Or in PowerShell:
   ```powershell
   cd C:\Users\utkar\OneDrive\Desktop\Devfest-2026
   .\start_all.bat
   ```
   
   **Note:** If you're already in a subdirectory (like `linkedin_scraper`), navigate back to root first:
   ```cmd
   cd ..
   start_all.bat
   ```

### What start_all.bat does:

1. ✅ Installs LinkedIn Scraper dependencies
2. ✅ Starts Ollama Server (WSL)
3. ✅ Starts LLM Scripts Server (port 8001) in WSL
4. ✅ Starts LinkedIn Scraper Server (port 8000) on Windows
5. ✅ Starts GitHub Matcher Server (port 8002) on Windows
6. ✅ Starts Frontend (port 3000) on Windows

### Server Endpoints:

After running `start_all.bat`, you should have:

- **Ollama Server:** `http://localhost:11434` (WSL)
- **LLM Scripts API:** `http://localhost:8001` (WSL)
- **LinkedIn Scraper API:** `http://localhost:8000` (Windows)
- **GitHub Matcher API:** `http://localhost:8002` (Windows)
- **Frontend:** `http://localhost:3000` (Windows)

### Manual Start (Alternative):

If you prefer to start servers manually, here's the order:

1. **Start Ollama Server (WSL):**
   ```cmd
   wsl bash -c "cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts && chmod +x start_ollama_wsl.sh && ./start_ollama_wsl.sh"
   ```

2. **Start LLM Scripts Server (WSL):**
   ```cmd
   wsl bash -c "cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts && source .venv/bin/activate && python app.py"
   ```

3. **Start LinkedIn Scraper Server (Windows):**
   ```cmd
   cd linkedin_scraper
   python server.py
   ```

4. **Start GitHub Matcher Server (Windows):**
   ```cmd
   cd llmGitHub
   python app.py
   ```

5. **Start Frontend (Windows):**
   ```cmd
   cd my-app
   npm run dev
   ```

**Note:** For steps 1-2 (WSL commands), these are WSL-specific and need to be run through `wsl` command. Steps 3-5 can be run directly in Windows Command Prompt or PowerShell.

---

## Step 4: Using the Application

1. **Open your browser** and go to: `http://localhost:3000`

2. **On the Dashboard:**
   - Enter your **GitHub Profile URL** (e.g., `https://github.com/username`)
   - Click **"Start Questions"**

3. **Answer the Questions:**
   - Question 1: Professional goal
   - Question 2: Technical skills
   - Question 3: Projects/interests
   - Question 4: Connection type (hiring community / collaborators)
   - Question 5: Engagement type (open source, startup, etc.)

4. **View Results:**
   - GitHub results will start loading in the background
   - After answering questions, you'll see:
     - **10 GitHub profiles** (automatically fetched)
     - **10 LinkedIn profiles** (if LinkedIn scraper is running and authenticated)

5. **Click on Cards:**
   - Click any profile card to open their GitHub or LinkedIn profile in a new tab

---

## Troubleshooting

### LinkedIn Authentication Error:
- **Error:** `AuthenticationError: Not logged in`
- **Solution:** Create a new LinkedIn session by running `python samples/create_session.py` in the `linkedin_scraper` directory

### Port Already in Use:
- **Error:** `address already in use`
- **Solution:** 
  - Close any existing servers running on those ports
  - Or change the port in the respective server files

### CORS Errors:
- **Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`
- **Solution:** Make sure all backend servers (LinkedIn scraper, LLM scripts, GitHub matcher) are running

### LLM Server Connection Refused:
- **Error:** `ERR_CONNECTION_REFUSED` on port 8001
- **Solution:** 
  - Make sure Ollama is running in WSL
  - Make sure LLM scripts server is running
  - Check that port 8001 is accessible

### GitHub API Not Responding:
- **Error:** GitHub fetch takes too long or fails
- **Solution:**
  - Make sure GitHub Matcher server is running on port 8002
  - Check that the GitHub API token is configured correctly

---

## Quick Start Summary

1. ✅ Create LinkedIn session:
   ```cmd
   cd linkedin_scraper
   pip install -e .
   python samples/create_session.py
   ```

2. ✅ Install dependencies (run each command separately or use semicolons):
   ```cmd
   cd linkedin_scraper
   pip install -r requirements.txt
   cd ..
   cd llm-scripts
   pip install -r requirements.txt
   cd ..
   cd llmGitHub
   pip install -r requirements.txt
   cd ..
   cd my-app
   npm install
   cd ..
   ```

3. ✅ Run `start_all.bat` to start all servers:
   ```cmd
   start_all.bat
   ```

4. ✅ Open `http://localhost:3000` in your browser

5. ✅ Enter GitHub URL and answer questions

6. ✅ View your matches!

---

## File Structure

```
Devfest-2026/
├── linkedin_scraper/          # LinkedIn scraper API (port 8000)
│   ├── linkedin_session.json  # Your LinkedIn session (create this!)
│   └── samples/
│       └── create_session.py  # Script to create session
├── llm-scripts/               # LLM scripts API (port 8001, WSL)
├── llmGitHub/                 # GitHub matcher API (port 8002)
├── my-app/                    # Frontend (port 3000)
└── start_all.bat              # Script to start everything
```

---

## Notes

- The LinkedIn session file (`linkedin_session.json`) expires periodically. You'll need to recreate it when this happens.
- All `.venv/` and `__pycache__/` directories are ignored by git (as they should be).
- Make sure WSL is properly configured before running `start_all.bat`.
- The GitHub API requires a valid GitHub token (configured in `llmGitHub/github_tools.py`).

---

**That's it! You're all set up. Enjoy matching! 🚀**

# 🌿💚 ChroniCompanion 💚🌿

**A gentle, comprehensive journaling app for chronic illness and mental health tracking**

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A thoughtfully designed digital companion for people managing chronic illness and mental health conditions, featuring intelligent tracking, AI-powered insights, and medical-grade reporting.

## 🌟 Features

### 📝 Core Functionality

- **Dual Entry System**: Separate morning and evening reflection prompts
- **Comprehensive Symptom Tracking**: Pain, fatigue, mood, energy, anxiety monitoring
- **Gentle AI Insights**: Supportive summaries and encouragement (OpenAI integration)
- **Medical Export**: Professional PDF reports formatted for healthcare providers
- **Privacy-First Design**: Local SQLite database, your data stays with you

### 🎯 Tracking Categories

| Category    | Tracking Method          | Purpose                              |
| ----------- | ------------------------ | ------------------------------------ |
| **Mood**    | 1-10 interactive sliders | Overall emotional well-being         |
| **Energy**  | 1-10 interactive sliders | Physical and mental energy levels    |
| **Pain**    | 0-10 clinical scale      | Pain intensity monitoring            |
| **Fatigue** | 0-10 clinical scale      | Exhaustion and tiredness tracking    |
| **Anxiety** | 1-10 interactive sliders | Anxiety levels and stress monitoring |
| **Sleep**   | Qualitative dropdown     | Sleep quality assessment             |

### 📱 Interactive Interface

- **Morning Reflections**: "How are you feeling?", "What are you hoping for today?"
- **Evening Reviews**: "How did your day unfold?", "What are you grateful for?"
- **Visual Sliders**: Intuitive symptom tracking with real-time feedback
- **Entry History**: Beautiful, searchable journal with trend visualisation
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile

### 🤖 AI-Powered Features

- **Gentle Summaries**: Compassionate AI analysis of your entries
- **Supportive Insights**: Encouraging patterns recognition and coping suggestions
- **Weekly Reflections**: AI-generated progress reviews and affirmations
- **Trauma-Informed**: Never judgmental, always supportive and understanding

## 📊 Health Tracking Capabilities

- **🌅 Morning Entries**: Feelings, hopes, symptoms, energy levels
- **🌙 Evening Entries**: Day reviews, gratitude, symptom progression
- **📈 Mood Tracking**: 1-10 scale with trend analysis over time
- **⚡ Energy Monitoring**: Daily energy patterns and fatigue cycles
- **🩺 Pain Documentation**: Clinical-grade pain scale (0-10) tracking
- **💤 Sleep Quality**: Comprehensive sleep pattern analysis
- **📋 Additional Notes**: Free-form journaling for context and details

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)
- 2GB available disk space
- Optional: OpenAI API key for AI features

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/ChroniCompanion.git
   cd ChroniCompanion
   ```

2. **Install dependencies**

   ```bash
   pip3 install -r requirements.txt
   ```

3. **Optional: Configure AI Features**

   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   # OPENAI_API_KEY=your_api_key_here
   ```

4. **Start the application**

   ```bash
   python3 run_app.py
   ```

5. **Open your journal**

   - Backend runs at: `http://localhost:8000`
   - Open `frontend/index.html` in your browser
   - Or serve frontend: `cd frontend && python3 -m http.server 3000`

### Validation

- Visit `http://localhost:8000/health` to verify backend
- Check `http://localhost:8000/docs` for API documentation
- Create your first journal entry to test functionality

## 🏗️ Architecture

### Project Structure

```
ChroniCompanion/
├── 🎨 frontend/               # Clean, responsive UI
│   ├── index.html            # Main application interface
│   ├── js/                   # Interactive JavaScript
│   │   └── main.js          # Application logic & API calls
│   └── assets/              # Icons and images
├── 🔧 backend/               # FastAPI REST API
│   ├── main.py              # Application entry point
│   ├── models.py            # Database schema & validation
│   ├── database.py          # SQLite configuration
│   ├── api/                 # RESTful endpoints
│   │   └── routes.py        # CRUD operations
│   └── services/            # Business logic
│       ├── openai_service.py    # AI integration
│       └── export_service.py    # PDF generation
├── 📊 data/                  # SQLite database storage
│   └── chroni_companion.db  # Your private journal data
├── 🔧 Configuration Files
│   ├── run_app.py           # Easy startup script
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example        # Environment template
│   └── .gitignore          # Privacy protection
└── 📚 Documentation
    └── README.md           # This comprehensive guide
```

### API Endpoints

| Endpoint                     | Method | Description                    |
| ---------------------------- | ------ | ------------------------------ |
| `/api/entries`               | GET    | Retrieve journal entries       |
| `/api/entries`               | POST   | Create new journal entry       |
| `/api/entries/{id}`          | GET    | Get specific entry             |
| `/api/entries/{id}`          | PUT    | Update existing entry          |
| `/api/entries/{id}`          | DELETE | Remove entry                   |
| `/api/entries/stats/summary` | GET    | Health statistics overview     |
| `/api/ai/feedback`           | POST   | Generate AI insights           |
| `/api/ai/weekly-reflection`  | GET    | Weekly AI reflection           |
| `/api/export`                | GET    | Export comprehensive PDF       |
| `/api/export/doctor-summary` | GET    | Medical summary for healthcare |
| `/api/analytics/trends`      | GET    | Trend analysis data            |

### Design Patterns

- **Repository Pattern**: Clean data access through SQLAlchemy ORM
- **Service Layer**: Business logic separation (AI, Export, Analytics)
- **RESTful API**: Standard HTTP methods and status codes
- **Observer Pattern**: Real-time UI updates via JavaScript
- **Strategy Pattern**: Multiple export formats and AI prompt strategies
- **Factory Pattern**: Database session and service initialisation

## 🎨 Customization

### Adding Custom Questions

Edit the HTML form sections in `frontend/index.html`:

```html
<div>
  <label>Your custom morning question?</label>
  <textarea
    name="custom_field"
    rows="3"
    placeholder="Your guidance text..."
  ></textarea>
</div>
```

### Modifying AI Prompts

Customize the AI personality in `backend/services/openai_service.py`:

```python
prompt = f"""
You are a [your preferred tone] AI assistant for chronic illness...
Focus on:
- Your specific values
- Your preferred therapeutic approach
- Your community's needs
"""
```

### Styling Customisation

The app uses Tailwind CSS with custom sage/lavender theme:

```javascript
// In frontend/index.html, modify the color scheme:
sage: {
    500: '#your-preferred-green',
    600: '#darker-shade',
}
```

## 🌿 Perfect for Chronic Illness Management

This app excels for various health conditions:

- **🦴 Chronic Pain**: Fibromyalgia, arthritis, back pain, migraines
- **🧠 Mental Health**: Depression, anxiety, PTSD, bipolar disorder
- **⚡ Fatigue Conditions**: ME/CFS, long COVID, autoimmune disorders
- **🩺 Complex Conditions**: Multiple diagnoses, rare diseases, chronic illness
- **👥 Care Teams**: Shareable reports for doctors, therapists, specialists

## 🛠️ Technical Implementation

### Key Technologies

- **FastAPI**: Modern, fast API framework with automatic documentation
- **SQLAlchemy**: Robust ORM with SQLite for local data storage
- **OpenAI API**: GPT-3.5-turbo for compassionate AI insights
- **ReportLab**: Professional PDF generation for medical reports
- **Tailwind CSS**: Beautiful, responsive UI with accessibility focus
- **Vanilla JavaScript**: Lightweight, no-framework frontend

### Performance Features

- **Local Database**: No internet required for core functionality
- **Efficient Queries**: Optimized SQLAlchemy queries with indexing
- **Lazy Loading**: AI features only activate when needed
- **Progressive Enhancement**: Works without JavaScript for accessibility
- **Responsive Caching**: Smart data loading and local storage fallbacks

## 🔧 Configuration Options

### Environment Variables (.env)

```bash
# OpenAI Configuration (optional)
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///./data/chroni_companion.db

# API Configuration
API_HOST=127.0.0.1
API_PORT=8000
DEBUG=True

# CORS Configuration (for production)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Application Settings

```python
# Customize in backend/main.py
CORS_ORIGINS = ["*"]  # Restrict in production
AI_ENABLED = bool(os.getenv("OPENAI_API_KEY"))
DATABASE_ECHO = False  # Set True for SQL debugging
```

## 📈 Future Enhancements

- **📱 Mobile App**: React Native companion app
- **🔔 Smart Reminders**: Gentle notifications for journal entries
- **📊 Advanced Analytics**: Trend analysis and pattern recognition
- **👥 Care Team Sharing**: Secure sharing with healthcare providers
- **🌐 Cloud Sync**: Optional encrypted cloud backup
- **📈 Progress Goals**: Wellness goal setting and tracking
- **🎭 Mood Boards**: Visual mood tracking with images and colors
- **🔗 Health Device Integration**: Fitbit, Apple Health, Google Fit
- **🤖 Advanced AI**: Personalized coping strategy suggestions
- **📚 Resource Library**: Curated articles and self-care resources

## 📞 Support & Contributing

### Issues & Suggestions

Found a bug or have an idea? [Open an issue](https://github.com/yourusername/ChroniCompanion/issues)!

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Ensure accessibility compliance
5. Submit a pull request

### Development Setup

```bash
# Development dependencies
pip3 install -r requirements.txt

# Run backend with hot reload
python3 run_app.py

# Serve frontend for development
cd frontend && python3 -m http.server 3000

# Database migrations (when needed)
python3 -c "from backend.database import init_db; init_db()"
```

## 🏥 Medical Disclaimer

**Important**: ChroniCompanion is a personal wellness tool and not a substitute for professional medical care. Always consult healthcare providers for medical decisions. This app does not diagnose, treat, or provide medical advice.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) by Sebastian Ramirez
- Powered by [OpenAI](https://openai.com/) for compassionate AI insights
- Styled with [Tailwind CSS](https://tailwindcss.com/) for accessibility
- Inspired by the chronic illness community and their resilience
- Designed with input from healthcare providers and patients

## 🎯 About This Project

ChroniCompanion represents a portfolio-quality healthcare application showcasing:

- **Accessibility-First Design**: WCAG compliant, trauma-informed interface
- **Medical-Grade Security**: Local data storage, privacy by design
- **Professional Architecture**: Clean code, comprehensive testing
- **User-Centered Design**: Built with and for the chronic illness community
- **Production Ready**: Error handling, logging, data validation

Perfect for demonstrating skills in:

- Healthcare application development
- Accessible web design
- API design and documentation
- Database modeling and optimization
- AI integration and prompt engineering
- PDF generation and medical reporting
- Privacy-focused application architecture

## 💚 Community

This app is built **by** and **for** the chronic illness community. Your feedback, experiences, and suggestions help make this tool more valuable for everyone managing health challenges.

### Connect With Us

- **GitHub Discussions**: Share experiences and suggestions
- **Issue Tracker**: Report bugs or request features
- **Email**: [your-email] for private feedback

---

_Built with 💚 for the chronic illness and mental health community_

**"Every day you survive is a victory worth recording." - ChroniCompanion**

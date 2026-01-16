# 🤿 MN90 Mobile Planner

> **Professional Dive Planning Tool** - Plan your dives safely with French MN90 decompression tables on any device! 📱💻

[![HTML5](https://img.shields.io/badge/HTML5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)](https://html.spec.whatwg.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-%23F7DF1E.svg?style=for-the-badge&logo=javascript&logoColor=black)](https://www.javascript.com)
[![Responsive](https://img.shields.io/badge/Responsive-Mobile%20First-blue?style=for-the-badge)](https://en.wikipedia.org/wiki/Responsive_web_design)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

---

## ✨ Features

### 🧮 Advanced Dive Calculations
- **Real-time dive planning** with instant feedback
- **Autonomy calculations** (bottom time vs. air consumption)
- **Safety pressure management** and gas reserve tracking
- **Decompression requirements** based on MN90 French tables
- **Multi-level dive profiles** with stop simulations

### 📊 Interactive Visualizations
- **Beautiful dive profiles** with color-coded decompression stops
  - 🟠 Bottom time (orange)
  - 🔵 15m stops (cyan)
  - 🟢 12m stops (green)
  - 🟣 9m stops (purple)
  - 🔴 6m stops (red/pink)
  - 🟡 3m stops (yellow)
- **Live graphing** with Chart.js
- **DTR (Decompression Time Remaining)** display
- **Autonomy trends** showing consumption patterns
- **MN90 tables viewer** with dynamic columns

### 📱 Fully Responsive Design
- ✅ **Desktop** - Full-featured split-view interface
- ✅ **Tablet** - Optimized vertical layout
- ✅ **Mobile** - Touch-friendly controls (handles, sliders)
- ✅ **Drag-to-resize** panels on all devices
- ✅ **Touch-optimized sliders** (28px handles on mobile)

### 🎯 Three Powerful Tabs

#### 1️⃣ **Autonomy Tab** 🫁
Calculate how long you can stay underwater based on:
- Depth (6-65m)
- Bottom time
- Gas mixture (AIR, Nitrox, Custom)
- Initial pressure
- Consumption rate
- Safety pressure margin

**Features:**
- Real-time validation warnings
- PPO₂ (Partial Pressure of Oxygen) calculation
- Optimal dive curves showing maximum possible bottom time
- Autonomy trends chart
- Margin of optimization analysis

#### 2️⃣ **Tables Tab** 📋
Browse official MN90 decompression tables with:
- Depth selection (6-65m)
- Bottom time lookup
- Dynamic decompression stops (P15, P12, P9, P6, P3)
- Group letter assignment
- **Colored dive profile visualization** with palier zones
- DTR calculation
- User's selected dive highlighted in summary

#### 3️⃣ **Settings Tab** ⚙️
Fine-tune your dive planning:
- Gas mix parameters
- PPO₂ limits
- Safety thresholds
- Consumption profiles

---

## 🚀 Quick Start

### Option 1: Direct Usage
Simply open `mn90_mobile_compact_improved.html` in any modern web browser:
```bash
# On macOS
open mn90_mobile_compact_improved.html

# On Linux
xdg-open mn90_mobile_compact_improved.html

# On Windows
start mn90_mobile_compact_improved.html
```

### Option 2: Local Server (Recommended)
```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then open: `http://localhost:8000/mn90_mobile_compact_improved.html`

---

## 📖 How to Use

### 🫁 **Autonomy Tab**

1. **Set your dive parameters:**
   - Adjust depth with the depth slider (6-65m)
   - Set bottom time (how long you want to stay at depth)
   - Choose your gas mixture (AIR, Nitrox, Custom)
   - Set initial bottle pressure
   - Adjust consumption rate

2. **View results:**
   - 📊 Real-time autonomy calculation
   - ⚠️ Validation warnings (if safety exceeded)
   - 📈 Consumption trend chart
   - 💡 Optimization margin (if you can dive longer safely)

3. **Optimize:**
   - The "optimal dive curves" (dashed lines) show maximum possible bottom time
   - Compare with your planned dive (solid lines)

### 📋 **Tables Tab**

1. **Select depth:** Use the depth slider (6-65m)
2. **Set bottom time:** Choose your desired time at depth
3. **View profile:** 
   - 🎨 Colored dive profile with palier zones
   - 📊 MN90 table for selected depth
   - 📌 Your selected dive highlighted
4. **Check decompression:**
   - 🔺 DTR (Decompression Time Remaining)
   - 🧮 Palier requirements (15m, 12m, 9m, 6m, 3m)
   - 📍 Group letter assignment

### ⚙️ **Settings Tab**
Configure defaults for all calculations and gas mixtures.

---

## 🎮 Mobile Controls

### 📍 Drag to Resize
- **All panel separators (▌)** are draggable
- Works with **mouse** or **touch**
- Panels maintain minimum size constraints
- Charts auto-update when resized

### 👆 Touch Optimization
- Sliders: **28px touch targets** on mobile (vs 18px on desktop)
- All controls have generous spacing
- Full touch support for all interactions

### 📱 Responsive Breakpoints
- **< 768px:** Tablet/Mobile layout (vertical stacking)
- **< 480px:** Small phone optimization
- **> 1024px:** Full desktop experience

---

## 🛠️ Technical Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML5 + Vanilla JavaScript |
| **Charting** | Chart.js 3.x |
| **Data** | MN90 French Decompression Tables (410+ entries) |
| **Styling** | CSS3 (Flexbox, Grid, Media Queries) |
| **Storage** | LocalStorage for settings (no server needed!) |
| **Compatibility** | All modern browsers (Chrome, Firefox, Safari, Edge) |

---

## 📊 Data Source

All decompression data based on the **French MN90 Standard** tables:
- ✅ 29 depths (6m to 65m)
- ✅ Multiple bottom times per depth
- ✅ Decompression stops at 15m, 12m, 9m, 6m, 3m
- ✅ Group letter assignments (A-P, *)
- ✅ 410+ dive profiles

---

## 🎨 Color Scheme

```
Background:     #1a2332 (Dark Navy)
Primary:        #00d4d4 (Cyan) ━ Dive planning color
Accent:         #06b6d4 (Bright Cyan) ━ Highlights
Success:        #2d8b8b (Teal)
Warning:        #f59e0b (Amber)
Danger:         #ef4444 (Red)

Palier Colors:
  P15: #06b6d4 (Cyan)
  P12: #22c55e (Green)
  P9:  #a855f7 (Purple)
  P6:  #f43f5e (Red)
  P3:  #fbbf24 (Yellow)
```

---

## ⚙️ Configuration

### Default Parameters
Edit inside `<script>` section:

```javascript
// Initial values
const initialDepth = 20;        // meters
const initialTime = 20;         // minutes
const initialConsumption = 23;  // L/min
const initialBottlePressure = 210; // bar
const safetyPressure = 50;      // bar reserve
```

### Gas Mixtures
Modify the gas mix definitions:
- AIR: 21% O₂, 79% N₂ (standard)
- NITROX: Customizable O₂ percentage
- CUSTOM: Define your own mix

---

## 🔐 Safety Considerations

⚠️ **DISCLAIMER:**
This tool is for **educational and planning purposes only**. Always:
- ✅ Follow your certification agency's guidelines
- ✅ Consult official tables and dive computers
- ✅ Never dive alone
- ✅ Plan conservative dives with margin
- ✅ Follow your training and experience limits
- ✅ Check with qualified instructors

**This tool does NOT replace professional dive training or certification!**

---

## 🐛 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full Support |
| Firefox | 88+ | ✅ Full Support |
| Safari | 14+ | ✅ Full Support |
| Edge | 90+ | ✅ Full Support |
| Opera | 76+ | ✅ Full Support |
| IE 11 | - | ❌ Not Supported |

---

## 📦 File Structure

```
mn90_mobile_compact_improved.html
├── HTML Structure (3 tabs)
├── CSS Styling (responsive)
├── Chart.js Integration
├── MN90 Data Tables (410 entries)
└── JavaScript Logic
    ├── Calculations
    ├── Validations
    ├── Graphing
    ├── Touch/Resize Handlers
    └── Mobile Optimization
```

**File Size:** ~120 KB (self-contained, no dependencies except Chart.js via CDN)

---

## 🎯 Key Formulas

### Autonomy Calculation
```
Final Pressure = Initial Pressure - (Depth + 10) / 10 × Consumption × Time
```

### Decompression Requirements
Based on MN90 tables:
- Depth & bottom time → Decompression stops
- Stops at 15m, 12m, 9m, 6m, 3m (as required)
- Ascent rate: 6 m/min (standard safety)

### PPO₂ (Partial Pressure O₂)
```
PPO₂ = (Depth/10 + 1) × O₂%
```

---

## 🚀 Features Roadmap

- [ ] 📍 Altitude dive adjustments
- [ ] 🌡️ Temperature effects simulation
- [ ] 💾 Dive logging & history
- [ ] 🔗 Share dive plans (URL encoding)
- [ ] 🌙 Dark/Light theme toggle
- [ ] 🗣️ Multi-language support (FR, EN, DE, ES)
- [ ] 📲 Progressive Web App (PWA)
- [ ] ⌚ Apple Watch integration
- [ ] 🎓 Tutorial & certification modes

---

## 🤝 Contributing

Contributions welcome! 🎉

### To Contribute:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Test thoroughly on mobile & desktop
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style:
- Use meaningful variable names
- Add comments for complex calculations
- Test on multiple devices
- Maintain responsive design

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 👨‍💻 Author

**Built with ❤️ for the diving community** 🤿

Questions? Issues? Feature requests?

→ Open an issue on GitHub  
→ Submit a pull request  
→ Contact: [your-email@example.com]

---

## 🙏 Acknowledgments

- 🇫🇷 **French MN90 Decompression Tables** - FFESSM/CMAS Standard
- 📊 **Chart.js** - Beautiful JavaScript Charting
- 🌐 **MDN Web Docs** - Web Platform Reference
- 🤿 **Diving Community** - For the feedback and safety culture

---

## 🎬 Usage Examples

### Scenario 1: Planning a 30m dive 🏊

1. Go to **Autonomy Tab**
2. Set Depth: **30m**
3. Initial Pressure: **210 bar**
4. Adjust bottom time until autonomy shows comfortable margin
5. Switch to **Tables Tab** to see exact decompression requirements
6. Review colored profile and DTR
7. Plan your decompression stops! ✅

### Scenario 2: Nitrox dive at 20m 🫁

1. Go to **Settings Tab**
2. Select **NITROX** gas mix
3. Set O₂: **32%** (Nitrox32)
4. Back to **Autonomy Tab** - see improved autonomy!
5. Check PPO₂ - should be safe at 20m
6. Plan your dive! 🚀

### Scenario 3: Mobile dive planning on the boat 📱

1. Open on your phone
2. Tap sliders to adjust parameters
3. Drag panel separators to see more details
4. Screenshot the profile for reference
5. Dive safely! 🌊

---

## 📞 Support

- **Bug Reports:** Open an issue with details
- **Feature Requests:** Describe your use case
- **Questions:** Check existing issues first
- **Security:** Report security issues privately

---

## 🌟 If you find this useful...

⭐ **Star the repository!**  
📢 **Share with your dive buddies!**  
💪 **Contribute improvements!**

---

**Happy diving! 🤿✨**

```
      ❖ ~ ❖ ~ ❖
    🤿 MN90 Planner 🤿
      ❖ ~ ❖ ~ ❖
     Safety First Always
```

---

**Last Updated:** 2025-01-16  
**Version:** 1.0.0  
**Status:** Stable & Production Ready ✅
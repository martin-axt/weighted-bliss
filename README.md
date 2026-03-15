# 🌸 Weighted Bliss

A minimalistic, modern todo list that helps you prioritize your life softly. Instead of a simple list, it uses a weighted system to surface what truly matters based on your current energy and needs.

## ⚖️ The Weighted System
Each task is assigned three scores (1-5):
- **Urgency**: How soon does this need to be done?
- **Mood**: How much are you looking forward to this? (Boring to Exciting)
- **Time**: How long will it take? (Long to Short)

The app calculates a **Total Weight** for each task. Higher weight tasks stay at the top, ensuring you always see the most impactful or energy-matched tasks first.

## 🚀 Running with Node
To run the project directly on your system:

```bash
npm install     # Install dependencies
npm run build   # Build the frontend assets
npm start       # Start the server (Express + SQLite)
```
Visit: `http://localhost:3001`

## � Running with Docker
Brief instructions to launch using Docker Compose:

```bash
# Build and run the container
docker compose up -d --build
```
Visit: `http://localhost:3001`

## 🔋 Tech Stack
- **Frontend**: Vanilla JS + Vite + CSS (Pastel Aesthetics)
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Infrastructure**: Docker & Docker Compose

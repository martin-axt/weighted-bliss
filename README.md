# 🌸 Weighted Bliss

A minimalistic, modern todo list that helps you prioritize your life softly. Instead of a simple list, it uses a weighted system to surface what truly matters based on your current energy and needs.

## ⚖️ The Weighted System
Each task is assigned three scores (1-5):
- **Urgency**: How soon does this need to be done?
- **Mood**: How much are you looking forward to this? (Boring to Exciting)
- **Time**: How long will it take? (Long to Short)

The app calculates a **Total Weight** for each task. Higher weight tasks stay at the top, ensuring you always see the most impactful or energy-matched tasks first.

## 🚀 Deployment (Raspberry Pi & Local Network)

This project is fully containerized with **Docker**, making it easy to host on a Raspberry Pi and access from any device in your local network.

### 1. Preparation
Ensure Docker and Docker Compose are installed on your Pi:
```bash
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and log back in
```

### 2. Launch
```bash
git clone https://github.com/martin-axt/weighted-bliss.git
cd weighted-bliss
docker compose up -d --build
```

### 3. Access
Open your browser and visit:
`http://your-pi-hostname.local:3001` or `http://<your-pi-ip>:3001`

## 🛠 Adding more apps in the future
This setup is designed for growth. Since we use Docker:
1. **Port based**: Run your next app on port `3002`, `3003`, etc.
2. **Domain based (Recommended)**: Install **Nginx Proxy Manager** on your Pi. You can then map `todo.local` to this app and `other-app.local` to your next project without worrying about port numbers.

## 💻 Local Development
If you want to run it locally on your Mac/PC:

```bash
npm install     # Install dependencies
npm run build   # Build the frontend
npm start       # Start the Express server & SQLite
```

## 🔋 Tech Stack
- **Frontend**: Vanilla JS + Vite + CSS (Pastel Aesthetics)
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Infrastructure**: Docker & Docker Compose

# Stage 1: Build the frontend
FROM node:20 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim
WORKDIR /app

# Install build dependencies for better-sqlite3 native module
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev

# Copy build files from the previous stage
COPY --from=build-stage /app/dist ./dist
# Copy the server file
COPY server.js ./

# We'll map the database file to a volume to persist data
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]

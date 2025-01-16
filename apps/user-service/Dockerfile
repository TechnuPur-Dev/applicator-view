# Step 1: Base image
FROM node:20.12.2-alpine

# Set environment variables
ENV NODE_ENV=production

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Change ownership of node_modules to current user
RUN chown -R node:node /app/node_modules

# Copy the rest of your application code to the working directory
COPY --chown=node:node . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build:user-service

# Switch to non-root user
USER node

# Expose the port
EXPOSE 3000

# Application startup
CMD ["node", "./apps/user-service/build/index.js"]

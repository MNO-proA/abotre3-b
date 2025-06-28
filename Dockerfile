# Creating multi-stage build for production

# Stage 1: Build the app with devDependencies

# Stage 1: Build
FROM node:22-alpine AS build
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git

WORKDIR /opt/app

COPY package*.json ./

# Install all dependencies including dev ones
RUN npm install

COPY . .

# Build admin panel
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
RUN apk add --no-cache vips-dev

ENV NODE_ENV=production
WORKDIR /opt/app

# Copy everything including node_modules and build
COPY --from=build /opt/app .

# Do NOT prune here — needed types will be removed
# RUN npm prune --omit=dev  ← leave this out for now

RUN chown -R node:node /opt/app
USER node

EXPOSE 1337

CMD ["npm", "run", "start"]













# FROM node:22-alpine AS build
# RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git

# ARG NODE_ENV=production
# ENV NODE_ENV=development 

# WORKDIR /opt/app

# COPY package.json package-lock.json ./
# RUN npm install -g node-gyp
# RUN npm config set fetch-retry-maxtimeout 600000 -g
# RUN npm install    # install ALL dependencies (not just prod)

# COPY . .

# RUN npm run build

# # Stage 2: Final production image
# FROM node:22-alpine
# RUN apk add --no-cache vips-dev

# ARG NODE_ENV=production
# ENV NODE_ENV=${NODE_ENV}

# WORKDIR /opt/app

# # Copy only built app and node_modules
# COPY --from=build /opt/app ./

# # Optional: Reinstall production-only deps (cleaner image)
# RUN npm prune --omit=dev

# ENV PATH=/opt/app/node_modules/.bin:$PATH

# RUN chown -R node:node /opt/app
# USER node

# EXPOSE 1337
# CMD ["npm", "run", "start"]





















# FROM node:22-alpine AS build
# RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1
# ARG NODE_ENV=production
# ENV NODE_ENV=${NODE_ENV}

# WORKDIR /opt/
# COPY package.json package-lock.json ./
# RUN npm install -g node-gyp
# RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install --only=production
# ENV PATH=/opt/node_modules/.bin:$PATH
# WORKDIR /opt/app
# COPY . .
# RUN npm run build

# # Creating final production image
# FROM node:22-alpine
# RUN apk add --no-cache vips-dev
# ARG NODE_ENV=production
# ENV NODE_ENV=${NODE_ENV}
# WORKDIR /opt/
# COPY --from=build /opt/node_modules ./node_modules
# WORKDIR /opt/app
# COPY --from=build /opt/app ./
# ENV PATH=/opt/node_modules/.bin:$PATH

# RUN chown -R node:node /opt/app
# USER node
# EXPOSE 1337
# CMD ["npm", "run", "start"]


# # Build using Dockerfile.prod
# docker build -f Dockerfile.prod -t ghcr.io/your-org/your-app:latest .

# # Push to GitHub Container Registry (requires login first)
# docker push ghcr.io/your-org/your-app:latest

# Dockerfile.dev===============================================================>
# FROM node:22-alpine
# # Installing libvips-dev for sharp Compatibility
# RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev git
# ARG NODE_ENV=development
# ENV NODE_ENV=${NODE_ENV}

# WORKDIR /opt/
# COPY package.json package-lock.json ./
# RUN npm install -g node-gyp
# RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
# ENV PATH=/opt/node_modules/.bin:$PATH

# WORKDIR /opt/app
# COPY . .
# RUN chown -R node:node /opt/app
# USER node
# RUN ["npm", "run", "build"]
# EXPOSE 1337
# CMD ["npm", "run", "develop"]

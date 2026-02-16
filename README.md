# Restaurant Frontend

React-based frontend for the Restaurant Management System.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## CI/CD Pipeline

This repository uses GitHub Actions for automated deployment:

1. **On Push to `main` or `develop`**:
   - Runs tests and linting
   - Builds Docker image
   - Pushes to Docker Hub with commit SHA tag

2. **On Push to `main` only**:
   - Updates the `restaurant-infrastructure` repo with new image tag
   - ArgoCD automatically deploys the new version

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `GH_PAT` | GitHub Personal Access Token (to push to infrastructure repo) |

## Docker

```bash
# Build locally
docker build -t restaurant-frontend .

# Run locally
docker run -p 80:80 restaurant-frontend
```




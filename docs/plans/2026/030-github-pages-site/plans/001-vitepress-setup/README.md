# Sub-Plan 1: VitePress Setup and GitHub Actions Deployment

Status: Completed

## Overview

Set up the VitePress project structure and GitHub Actions workflow for deploying to GitHub Pages.

## Changes

- Add VitePress as a dev dependency
- Create `site/` directory with VitePress configuration (`site/.vitepress/config.ts`)
- Set `base: '/sutto/'` in VitePress config (required for GitHub Pages repository sites)
- Configure site metadata (title, description, navigation, sidebar)
- Create a minimal index page as placeholder
- Add GitHub Actions workflow (`.github/workflows/deploy-site.yml`) to build and deploy on push to main
- Add npm scripts for local development (`site:dev`, `site:build`)

## Manual Steps

- In GitHub repository settings (Settings → Pages → Source), change the source to **"GitHub Actions"**

## Verification

- `npm run site:dev` starts local preview
- `npm run site:build` generates static output
- GitHub Actions workflow deploys successfully
- Site is accessible at GitHub Pages URL

## Estimate

- 2 points

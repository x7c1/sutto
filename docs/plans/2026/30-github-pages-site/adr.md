# ADR: Static Site Generator for GitHub Pages

## Context

We need to choose how to build the GitHub Pages site for user-facing documentation. The site will start with a Usage page and expand over time.

## Options

### Option A: Plain Markdown/HTML (no generator)

GitHub Pages can serve static files directly. Markdown files are rendered by GitHub's built-in Jekyll pipeline unless explicitly disabled.

**Pros**:
- Zero setup, no build step needed
- No additional dependencies
- Files are readable as-is on GitHub

**Cons**:
- No shared layout, navigation, or theming — each page is standalone
- Adding consistent navigation across pages requires manual HTML duplication
- Not practical for a multi-page site that grows over time

### Option B: Jekyll

GitHub Pages natively supports Jekyll. No CI build step is required — GitHub builds the site automatically from source files.

**Pros**:
- Native GitHub Pages support (no Actions workflow needed for basic usage)
- Rich theme ecosystem (including minimal themes suited for documentation)
- Layouts and includes for shared navigation and structure
- Markdown-based content with front matter for metadata
- No Node.js dependency for the site itself

**Cons**:
- Ruby-based — local preview requires Ruby/Bundler installation
- Configuration and theming can be unintuitive
- Less commonly used in modern JS/TS projects

### Option C: Hugo

Hugo is a fast static site generator written in Go. Requires a GitHub Actions workflow to build and deploy.

**Pros**:
- Very fast build times
- Good documentation theme options (e.g., Hugo Book, Docsy)
- Single binary, easy to install

**Cons**:
- Requires GitHub Actions workflow for deployment
- Go templating syntax has a learning curve
- Another tool to maintain outside the Node.js ecosystem

### Option D: VitePress

Vue.js-based static site generator built by the Vite team, designed specifically for documentation sites.

**Pros**:
- Documentation-focused — sidebar, search, and navigation built in
- Stays within the Node.js/npm ecosystem
- Minimal configuration needed to get started
- Hot reload for local development

**Cons**:
- Adds npm dependencies to the project
- Requires GitHub Actions workflow for deployment
- Vue.js-based — different from the rest of this project's stack

### Option E: Astro + Starlight

Astro is a general-purpose static site generator. Starlight is Astro's official documentation theme that adds sidebar navigation, search, and other docs features on top of Astro. While Astro alone has no documentation-specific functionality, Starlight provides it as a pre-built layer.

**Pros**:
- Framework-agnostic — can use React, Vue, Svelte, or plain HTML
- Starlight theme provides documentation features (sidebar, search, i18n)
- Flexible for non-documentation pages in the future
- Stays within the Node.js/npm ecosystem

**Cons**:
- Adds npm dependencies to the project
- Requires GitHub Actions workflow for deployment
- More general-purpose — heavier setup than VitePress for a pure docs site

### Options D vs E

Both VitePress and Astro + Starlight generate static HTML/CSS/JS that can be deployed to GitHub Pages. The key difference is their design philosophy:

- **VitePress** is purpose-built for documentation. Documentation features (sidebar, search, navigation) are part of the core. Configuration is minimal — a docs site works out of the box.
- **Astro** is a general-purpose site generator. It can build any kind of static site (blogs, landing pages, marketing sites), not just documentation. Starlight adds the documentation layer as a theme. This makes Astro more flexible if the site needs non-documentation pages in the future, but involves more setup for a pure docs site.

If the site will only ever be documentation, VitePress is simpler. If there may be non-documentation pages later, Astro's flexibility is an advantage.

## Recommendation

No recommendation — this decision depends on preference for ecosystem alignment vs. simplicity.

- **Minimal effort**: Jekyll (Option B) — native support, no Actions needed
- **Docs-focused, JS ecosystem**: VitePress (Option D) — minimal setup for documentation
- **Flexible, JS ecosystem**: Astro/Starlight (Option E) — expandable beyond docs
- **Simplest for now**: Plain Markdown (Option A) — but will not scale

## Decision

**Option D: VitePress**

All planned pages are documentation/content pages. The Pricing page may need some custom styling (e.g., pricing cards, CTA buttons), but VitePress supports embedding Vue components in Markdown, which is sufficient. Payment processing will be handled by an external service (e.g., Stripe), so no application-level pages are needed on the site itself.

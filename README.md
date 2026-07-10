Clout Calc — GitHub Pages deployment

Web based arrow ballistics calculator.

This repository is a small static site. To publish it as a GitHub Pages site you have two options:

1) Automatic via GitHub Actions (recommended)
   - The workflow `.github/workflows/deploy-gh-pages.yml` packages the repository root and deploys it using GitHub Pages Actions on every push to `main`.
   - No additional secrets are required; the workflow uses the built-in `GITHUB_TOKEN`.
   - In repository Settings -> Pages, set the Source to `GitHub Actions`.
   - After the first successful run, Pages will be available at `https://<your-username>.github.io/<repo-name>/`.

2) Manual via repository settings
   - Go to repository Settings -> Pages and set the source to deploy from a branch.
   - Choose either `main` / `(root)` or a dedicated `gh-pages` branch.

Notes and recommendations
- Keep asset references relative (they already are), e.g. `js/clout-calc.js`, `js/ux.js`, `js/score-sim.js`, `css/styles.css`.
- Use either branch-based Pages publishing or the GitHub Actions workflow, not both at the same time.

To test locally:

```bash
# from the repo root
python3 -m http.server 8000
# open http://localhost:8000 in your browser
```

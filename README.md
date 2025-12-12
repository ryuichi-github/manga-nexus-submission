# Manga Nexus

**Manga Nexus** is a graph-based visualization tool designed to help users discover new manga titles based on shared community recommendations. Unlike traditional list-based searches, it visualizes the "latent" connections between titles, enabling serendipitous discovery.

**[Live Demo Link (Vercel)](https://manga-explorer-two.vercel.app/)**

## Features
- **Interactive Graph:** Visualize relationships between 8,000+ manga titles.
- **Discovery Mode:** A cold-start solution for users to identify preferences.
- **Faceted Filtering:** Filter nodes by Genre, Score, and Connection Strength.
- **Mobile Optimized:** Responsive "Bottom Sheet" UI for smartphone users.

## Tech Stack
- **Frontend:** Next.js (React), TypeScript, Tailwind CSS
- **Visualization:** Sigma.js, Graphology
- **Data Processing:** Python (Pandas, BeautifulSoup)

## Project Structure
- `/components`: React components (GraphView, DetailPanel, etc.)
- `/pages`: Next.js pages and API routes
- `/notebooks`: Python notebooks used for data scraping and processing
- `/public`: Static assets and the graph JSON dataset

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/ryuichi-github/manga-nexus-submission.git
cd manga-nexus-submission

# Install dependencies
npm install

# Run the development server
npm run dev
Open http://localhost:3000 

# Production Build
npm run build
npm start
# Open http://localhost:3000
```

## Data Sources & Attribution
This project uses a hybrid dataset constructed from the following sources:

1. **Structured Metadata:** [MyAnimeList Manga Dataset (Kaggle)](https://www.kaggle.com/datasets/joshjms/kawaii)

2. **Social Recommendation Data:** Scraped from [mimizun.com](https://mimizun.com/) (Archives of 2ch/5ch)
   * Used to generate weighted edges based on user co-occurrences and reply chains.
   * Thread Ids can be found in `/reference/mimizun_threads.txt`
   * *Note: Data processing scripts and the verification logs are included in the `/notebooks` directory.*

## Final Report
For a detailed discussion of the conceptual framework, technical process, and AI transparency statement, please refer to the **Final Report** submitted separately.


## AI Usage
This project utilized AI assistance for generating boilerplate code and debugging TypeScript errors. The core logic, data pipeline design, and manual data validation were performed by the author. See the full report for the detailed AI Transparency Statement in the Final Report.
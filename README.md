# Auto Grader Frontend

React + Vite + TypeScript + TailwindCSS frontend for the auto grading system.

## Scripts
- npm install
- npm run dev
- npm run build
- npm run preview

## ENV
Copy `.env.example` to `.env` and adjust URLs.

```
VITE_GRADER_API_URL=http://localhost:8000
VITE_BOOKS_API_URL=http://localhost:8010
VITE_EMB_API_URL=http://localhost:8020
```

## Notes
- Light theme by default.
- Exam cards use glassmorphism with a single bottom progress bar and dynamic stage labels.
- Progress hook `useExamProgress` is stubbed; wire real API polling later.

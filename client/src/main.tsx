import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Load Prism CSS from CDN
const prismCss = document.createElement('link');
prismCss.rel = 'stylesheet';
prismCss.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.24.1/themes/prism-tomorrow.min.css';
document.head.appendChild(prismCss);

// Load Prism JS from CDN
const prismJs = document.createElement('script');
prismJs.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.24.1/prism.min.js';
document.head.appendChild(prismJs);

// Load COBOL language support
const prismCobol = document.createElement('script');
prismCobol.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.24.1/components/prism-cobol.min.js';
document.head.appendChild(prismCobol);

createRoot(document.getElementById("root")!).render(<App />);

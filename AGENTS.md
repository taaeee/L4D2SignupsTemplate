<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## State Persistence & Caching
When implementing dashboard or list views, NEVER show a full-page loading spinner when the user navigates away and comes back. Implement a lightweight client-side cache (e.g., module-level variables or sessionStorage) to immediately render previously fetched data while re-fetching in the background to avoid loading flashes.

## Alerts and Modals
NEVER use native browser dialogs like `alert()`, `confirm()`, or `prompt()`. They break the design aesthetics of the web app. Instead, use the custom modals already available in the application (e.g. `ConfirmModal`) or implement custom UI components for notifications (like `sonner` for toasts) and user input.

## Hover Effects and DOM Mutations
NEVER mutate the DOM directly for hover effects (e.g., using `onMouseEnter={e => e.currentTarget.style.transform = ...}`). This desyncs the real DOM from React's Virtual DOM, causing "stuck" styles when the component re-renders or when the mouse leaves after the component's state changes (preventing `onMouseLeave` from cleaning up). ALWAYS use CSS `:hover` pseudo-classes or React state (e.g., `const [hoveredId, setHoveredId] = useState(null)`) to handle interactive styles.

## Emojis
NEVER use emojis, use svg instead.

## Traduction
.
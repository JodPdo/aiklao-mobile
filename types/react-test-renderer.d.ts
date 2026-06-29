// Minimal ambient declaration for react-test-renderer (no @types package added,
// so `npm ci` stays in sync with the committed lockfile). Used only by unit
// tests to render hooks under Jest.
declare module 'react-test-renderer';

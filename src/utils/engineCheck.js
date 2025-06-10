/**
 * Utility to check which JavaScript engine is running
 * This project uses JSC (JavaScriptCore) exclusively
 */

export const getJSEngine = () => {
  // Always return JSC - this project uses JSC exclusively
  return 'JSC (JavaScriptCore)';
};

export const logJSEngine = () => {
  const engine = getJSEngine();
  console.log(`JavaScript Engine: ${engine}`);
  return engine;
};

export const isJSCEnabled = () => {
  // Always true since we only use JSC
  return true;
}; 
import { adapters } from './compat';
import { createRuntime, readModes } from './controller';

declare global {
  interface Window { CosmicRuntime?: ReturnType<typeof createRuntime> }
}

// A synchronous classic bundle loads before app.js. Missing/unknown switches
// fail to legacy; changing a switch requires a reviewed source change/reload.
const script = document.currentScript as HTMLScriptElement | null;
window.CosmicRuntime = createRuntime(adapters, readModes(script?.dataset ?? {}));

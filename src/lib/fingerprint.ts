/**
 * Client-side device fingerprinting for fraud detection.
 * Generates a unique-ish device identifier from browser properties.
 * No external dependencies — uses native Web APIs only.
 */

export interface DeviceFingerprint {
  hash: string;
  components: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    timezone: string;
    colorDepth: number;
    hardwareConcurrency: number;
    deviceMemory: number | null;
    touchSupport: boolean;
    webglRenderer: string | null;
    canvasHash: string;
    fonts: string;
  };
}

/**
 * Generate a device fingerprint from browser characteristics.
 * Returns a hash + the raw component values.
 */
export async function generateFingerprint(): Promise<DeviceFingerprint> {
  const components = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}x${screen.availWidth}x${screen.availHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || null,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    webglRenderer: getWebGLRenderer(),
    canvasHash: getCanvasFingerprint(),
    fonts: detectFonts(),
  };

  // Create a stable hash from all components
  const raw = JSON.stringify(components);
  const hash = await sha256(raw);

  return { hash, components };
}

/**
 * Get the WebGL renderer string (GPU identifier)
 */
function getWebGLRenderer(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'unknown';

    return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || null;
  } catch {
    return null;
  }
}

/**
 * Generate a canvas-based fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // Draw text with specific styling — renders slightly differently on each device
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Beam fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Beam fingerprint', 4, 17);

    return canvas.toDataURL().slice(-50); // Last 50 chars as short hash
  } catch {
    return 'error';
  }
}

/**
 * Detect installed fonts by measuring text width differences
 */
function detectFonts(): string {
  const testFonts = [
    'monospace', 'sans-serif', 'serif',
    'Arial', 'Courier New', 'Georgia', 'Helvetica',
    'Times New Roman', 'Verdana', 'Comic Sans MS',
    'Impact', 'Lucida Console', 'Trebuchet MS',
  ];

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    const testString = 'mmmmmmmmmmlli';
    const baseFont = 'monospace';
    ctx.font = `72px ${baseFont}`;
    const baseWidth = ctx.measureText(testString).width;

    const detected = testFonts.filter((font) => {
      ctx.font = `72px ${font}, ${baseFont}`;
      return ctx.measureText(testString).width !== baseWidth;
    });

    return detected.join(',');
  } catch {
    return 'error';
  }
}

/**
 * SHA-256 hash using SubtleCrypto
 */
async function sha256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple hash for environments without SubtleCrypto
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return 'fb-' + Math.abs(hash).toString(16);
  }
}

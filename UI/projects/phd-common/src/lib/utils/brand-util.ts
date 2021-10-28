export function applyBrand(brands: {[hostname: string]: unknown}): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const brand = brands[window.location.host];

        Object.keys(brand).forEach(key => document.documentElement.style.setProperty(`--${key}`, brand[key]));
    }
}
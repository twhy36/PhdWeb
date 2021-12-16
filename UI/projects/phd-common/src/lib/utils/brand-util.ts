export function applyBrand(brands: {[hostname: string]: unknown}): void {
	if (typeof window !== 'undefined' && typeof document !== 'undefined') {
		const brand = brands[window.location.host]['styles'];

		Object.keys(brand).forEach(key => document.documentElement.style.setProperty(`--${key}`, brand[key]));
	}
}

export function getBrandImageSrc(brands: {[hostname: string]: unknown}, imageProperty: string): string {
	if (typeof window !== 'undefined' && typeof document !== 'undefined') {
		return brands[window.location.host]['images'][imageProperty];
	}
}
export function applyBrand(brands: { [hostname: string]: unknown }): void
{
	if (typeof window !== 'undefined' && typeof document !== 'undefined')
	{
		const brand = brands[window.location.host]['styles'];

		Object.keys(brand).forEach(key => document.documentElement.style.setProperty(`--${key}`, brand[key]));
	}
}

export function getBrandImageSrc(brands: { [hostname: string]: unknown }, imageProperty: string): string
{
	if (typeof window !== 'undefined' && typeof document !== 'undefined')
	{
		return brands[window.location.host]['images'][imageProperty];
	}
}

export function getBannerImageSrc(brands: { [hostname: string]: unknown }, position: number): string
{
	if (typeof window !== 'undefined' && typeof document !== 'undefined')
	{
		return brands[window.location.host]['banner'][position];
	}
}

export function getBrandUrl(key: number, brandUrls: { pulte: string, delWebb: string, americanWest: string, diVosta: string, centex: string, johnWieland: string })
{
	if (financialBrands.americanWest.includes(key))
	{
		return brandUrls.americanWest;
	}
	else if (financialBrands.delWebb.includes(key))
	{
		return brandUrls.delWebb;
	}
	else if (financialBrands.diVosta.includes(key))
	{
		return brandUrls.diVosta;
	}
	else if (financialBrands.centex.includes(key))
	{
		return brandUrls.centex;
	}
	else if (financialBrands.johnWieland.includes(key))
	{
		return brandUrls.johnWieland;
	}
	else
	{ // If Pulte Brand OR Unknown Brand
		return brandUrls.pulte;
	}
}

export const financialBrands =
{
	pulte: [
		110,
		120,
	],
	delWebb: [
		310,
		320,
	],
	americanWest: [
		140,
	],
	diVosta: [
		200,
	],
	centex: [
		410,
	],
	johnWieland: [
		130,
	],
}

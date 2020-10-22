export function isNullOrEmpty(str: string): boolean {
	return (!str || !str.length);
}

export function isNull(str: string, nullValue: string): string {
	return (!!str ? str : nullValue);
}

export function underline(length: number): string {
	return "_".repeat(length);
}

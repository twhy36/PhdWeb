declare function escape(s: string): string;

export function encodeAndEscapeString(str: string)
{
	return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}  

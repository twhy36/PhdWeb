/// <reference lib="webworker" />

import { getChoicePriceRanges } from './modules/shared/classes/price-ranges';

addEventListener('message', ({ data }) =>
{
	let result: any = null;

	if (data.function === 'getChoicePriceRanges')
	{
		result = getChoicePriceRanges(data.args[0]);
	}

	postMessage(result);
});

/// <reference lib="webworker" />

import { getChoicePriceRanges } from '../../../phd-common/src/lib/utils/price-ranges.class';

addEventListener('message', ({ data }) =>
{
	let result: any = null;

	if (data.function === 'getChoicePriceRanges' && data.args[0])
	{
		result = getChoicePriceRanges(data.args[0]);
	}

	postMessage(result);
});

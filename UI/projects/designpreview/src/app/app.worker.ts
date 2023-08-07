/// <reference lib="webworker" />

import { ChoicePriceRange } from '../../../phd-common/src/lib/models/tree.model';
import { getChoicePriceRanges } from '../../../phd-common/src/lib/utils/price-ranges.class';

addEventListener('message', ({ data }) =>
{
	let result: ChoicePriceRange[] = null;

	if (data.function === 'getChoicePriceRanges' && data.args[0])
	{
		result = getChoicePriceRanges(data.args[0]);
	}

	postMessage(result);
});

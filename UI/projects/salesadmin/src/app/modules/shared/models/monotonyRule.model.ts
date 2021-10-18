export class MonotonyRule {
    monotonyRuleType: 'ColorScheme' | 'Elevation';
    lotId: number;
    relatedLotId: number;
}

export namespace MonotonyRuleDtos
{
	export interface IMonotonyRuleEventDto
	{
		lotId: number;
		monotonyRules: Array<MonotonyRule>;
	}
}

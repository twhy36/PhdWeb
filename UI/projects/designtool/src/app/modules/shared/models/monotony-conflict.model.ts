export class MonotonyConflict
{
	constructor()
	{
		this.monotonyConflict = false;
		this.conflictSeen = false;
		this.colorSchemeConflict = false;
		this.colorSchemeConflictOverride = false;
		this.elevationConflict = false;
		this.elevationConflictOverride = false;
		this.choiceOverride = false;
	}

	monotonyConflict: boolean;
	conflictSeen: boolean;
	colorSchemeConflict: boolean;
	colorSchemeConflictOverride: boolean;
	colorSchemeAttributeConflict: boolean;
	elevationConflict: boolean;
	elevationConflictOverride: boolean;
	choiceOverride: boolean;
}

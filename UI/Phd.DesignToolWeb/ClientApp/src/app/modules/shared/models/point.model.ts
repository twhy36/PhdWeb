export enum PointType {
    PICK_ONE = 1,
    PICK_ONE_OR_MORE = 3,
    PICK_ONE_OR_MORE_AND_QTY = 6,
    PICK_ZERO_OR_ONE = 2,
    PICK_ZERO_OR_MORE = 4,
    PICK_ZERO_OR_MANY_AND_QTY = 5,
    PICK_YES_OR_NO = 7
}

export enum PointStatus {
    REQUIRED,
    COMPLETED,
    CONFLICTED,
    VIEWED,
	UNVIEWED,
	PARTIALLY_COMPLETED
}

export enum ConstructionStageTypes
{
	Configured = 1,
	RTC = 2,
	Start = 3,
	Frame = 4,
	Second = 5,
	Final = 6
}

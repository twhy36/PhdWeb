export enum SaveStatusType {
    NOTHING_TO_SAVE = 1,
    NEED_TO_SAVE,
    SAVING,
    SAVED,
    ERROR_SAVING
}

export enum ActionBarCallType {
    PRIMARY_CALL_TO_ACTION = 1,
    SAVE_SCENARIO,
    DELETE_SCENARIO,
	SAVE_ALL_SCENARIOS,
	SIGN_AGREEMENT,
	PREVIEW_AGREEMENT,
	CANCEL_AGREEMENT,
	APPROVE_AGREEMENT,
	TERMINATION_AGREEMENT
}

export enum ChoiceCardDetailCallType {
	CLOSE_MODAL = 1,
	SAVE
}

export enum ModalMessages {
    Success = 'Changes have been saved successfully.',
    Error = 'An error has occurred while saving your changes. Please try again.',
    Unsaved = 'You have unsaved changes, are you sure you want to cancel?'
}

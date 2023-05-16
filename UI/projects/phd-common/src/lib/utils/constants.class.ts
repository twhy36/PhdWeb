export enum ModalMessages
{
    Success = 'Changes have been saved successfully.',
    Error = 'An error has occurred while saving your changes. Please try again.',
    Unsaved = 'You have unsaved changes, are you sure you want to cancel?'
}

export enum Elevations
{
    DetachedElevation = 361,
    AttachedElevation = 362
}

export enum CutOffOverride
{
    Message = `This will override the Cut-off. Change Orders that require an override due to cut-off will require manual approval in Schedules (even if auto approval is set to 'On' for construction).`
}
export enum Elevations
{
    DetachedElevation = 361,
    AttachedElevation = 362
}

export abstract class Constants
{
    static readonly ASSOCIATE = `Associate`;
    static readonly BUILD_MODE_BUYER = `buyer`;
    static readonly BUILD_MODE_BUYER_PREVIEW = `buyerPreview`;
    static readonly BUILD_MODE_MODEL = `model`;
    static readonly BUILD_MODE_PRESALE = `presale`;
    static readonly BUILD_MODE_PREVIEW = `preview`;
    static readonly BUILD_MODE_SPEC = `spec`;
    static readonly CANCEL = `Cancel`;
    static readonly CLOSE = `Close`;
    static readonly CONTINUE = `Continue`;
    static readonly DO_YOU_WISH_TO_CONTINUE = `Do you wish to continue?`;
    static readonly LOSE_CHANGES = `If you continue you will lose your changes.<br/><br/>Do you wish to continue?`;
    static readonly MODAL_ERROR = `An error has occurred while saving your changes. Please try again.`;
    static readonly MODAL_SUCCESS = `Changes have been saved successfully.`;
    static readonly MODAL_UNSAVED = `You have unsaved changes, are you sure you want to cancel?`;
    static readonly OVERRIDE_CUT_OFF = `This will override the Cut-off. Change Orders that require an override due to cut-off will require manual approval in Schedules (even if auto approval is set to 'On' for construction).`;
    static readonly OVERRIDE_MONOTONY = `This will override the Monotony Conflict`;
    static readonly OVERRIDE_MONOTONY_AND_CUT_OFF = `This will override the Monotony Conflict and the Cut-off`;
    static readonly REMOVE = `Remove`;
    static readonly SAVE = `Save`;
    static readonly WARNING = `Warning`;
}

export enum SalesAgreementStatuses
{
    Approved = 'Approved',
    Cancel = 'Cancel',
    Closed = 'Closed',
    OutForSignature = 'OutforSignature',
    Pending = 'Pending',
    Signed = 'Signed',
    Void = 'Void'
}
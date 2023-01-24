export class DesignPreviewError
{
    errorStack?: string;
    friendlyMessage: string;
    occuredFrom: string;
    occuredAt: Date;

    constructor(
        occuredFrom: string,
        errorStack?: string,
        friendlyMessage?: string,)
    {
        this.occuredAt = new Date();
        this.occuredFrom = occuredFrom;
        this.errorStack = errorStack;
        this.friendlyMessage = friendlyMessage;
    }
}
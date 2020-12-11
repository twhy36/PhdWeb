/*
 * Public API Surface of phd-common
 */

export {
	Permission, Claims, ClaimTypes, IdentityService,
	ConfirmModalComponent, SidePanelComponent,
	PhdColumnDirective, RowTogglerDirective, PhdTableComponent,
	BuildVersionComponent,
	ControlDisabledDirective,
	DragSourceDirective, DragTargetDirective,
	RequiresClaimDirective,
	parseBatchResults, getNewGuid, createBatch, createBatchBody, createBatchHeaders, createBatchGet,
	SpinnerComponent,
	loadScript, PhdCommonModule
} from './internal';

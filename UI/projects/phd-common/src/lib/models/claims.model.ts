export type ClaimTypes = 'CommunityTree' 
							| 'Configuration' 
							| 'DivisionCatalog' 
							| 'SalesAgreements' 
							| 'NationalCatalog' 
							| 'Attributes' 
							| 'CatalogImages' 
							| 'TreeImages' 
							| 'SalesAdmin' 
							| 'ContractTemplates' 
							| 'JobChangeOrders' 
							| 'Incentives' 
							| 'AutoApproval' 
							| 'PhdReports' 
							| 'ECOE' 
							| 'LockSalesAgreement' 
							| 'ExecuteReOrg' 
							| 'EnableCommunity' 
							| 'ColorManagement' 
							| 'LotRelationships'
							| 'InternalNotes'
							| 'DivisionOptions';

export type Claims = { [K in ClaimTypes]: number };

export enum Permission
{
	Read = 1,
	Create = 2,
	Edit = 4,
	Publish = 8,
	Approve = 16,
	Override = 32,
	DeleteCancel = 64
}

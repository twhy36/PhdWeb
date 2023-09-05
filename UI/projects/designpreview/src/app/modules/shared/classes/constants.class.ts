export abstract class Constants
{
	// contents and labels
	static readonly DIALOG_DISCLAIMER_CONFIRM = 'Close';
	static readonly DIALOG_DISCLAIMER_TITLE = 'Disclaimer';
	static readonly DISCLAIMER_OPTION_SELECTIONS = 'Option selections are not final until purchased via a signed agreement or change order.';
	static readonly DISCLAIMER_MESSAGE = 'This Design Preview is a tool designed to give our customers a general understanding of home options, material and finish upgrades and option/upgrade pricing (where provided) and prepare them for making actual option and upgrade selections in the future. No selections are being made using this tool, nor is this a contract for a home or reservation of a lot. The terms and conditions pertaining to a home purchase, including option and upgrade selections, will be contained only within a fully-executed Home Purchase Agreement or a Change Order to that agreement. Lots, home plans, elevations, options, upgrades, features and specifications and the availability and pricing of each may change without notice. Images are for marketing purposes only and may not reflect exact home designs or dimensions, specific components or materials used in home construction, specific manufacturer or models of components, or exact colors or textures of materials, all of which may vary in the course of actual construction and all of which seller has the right to change. Model homes may vary significantly in design, décor and available options and materials from homes available to purchase in a community.';
	static readonly FLOORPLAN_DISCLAIMER_MESSAGE = 'Floorplan may show options you selected as well as previously contracted options. Floorplans are for illustrative purposes only and may differ from actual available floor plans and actual features and measurements of completed home.';
	static readonly NO_IMAGE_AVAILABLE_PATH = 'assets/NoImageAvailable.png';
	static readonly PENDING_AND_CONTRACTED = 'Pending & Contracted Options';
	static readonly SELECT_ONE = 'Please select one of the choices below';
	static readonly SELECT_MANY = 'Please select at least one of the Choices below';
	static readonly SHOW_OPTIONS_TEXT = 'Show Pending and Contracted Options';

	// urls
	static readonly URL_SITECORE_PARTIAL = '/sitecore/content/pulte/pulte-home-page';
}

export enum ChoiceStatus
{
	Available = 'Available',
	Contracted = 'Contracted',
	ViewOnly = 'ViewOnly'
}
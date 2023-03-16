import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, ConnectableObservable, of } from 'rxjs';
import { map, catchError, publishReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Template } from '../models/template.model';
import { MergeField } from '../models/merge-field.model';
import { FileState } from '../models/file-state';
import { handleError } from '../utils/handle-error';

@Injectable()
export class ContractService
{
    private _ds: string = encodeURIComponent("$");

    private readonly _currentTemplateId = new Subject<number>();
    currentTemplateId$: Observable<number>;

    constructor(private _http: HttpClient)
    {
        this.currentTemplateId$ = this._currentTemplateId.pipe(
            publishReplay(1)
        );

        (<ConnectableObservable<number>>this.currentTemplateId$).connect();
    }

    selectTemplate(template: Template | number)
    {
        let templateId: number;

        if (typeof template === 'number')
        {
            templateId = template;
        } else
        {
            if (template)
            {
                templateId = template.templateId;
            } else
            {
                return;
            }
        }

        this._currentTemplateId.next(templateId);
    }

    getContractTemplateMarketId(templateId: number): Observable<number>
    {
        const entity = `contractTemplates`;
        const filter = `templateId eq ${templateId}`;
        const expand = `org`;
        const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}`;
        const url = `${environment.apiUrl}${entity}?${qryStr}`;

        return this._http.get(url).pipe(
            map(response =>
            {
                const marketId = response['value'][0]["org"]["edhMarketId"] as number;

                return marketId;
            }),
            catchError(handleError)
        );
    }

    getContractTemplates(marketId: number): Observable<Array<Template>>
    {
        const entity = `contractTemplates`;
        const filter = `org/edhMarketId eq ${marketId} and status ne 'Inactive'`;
        const orderBy = `displayOrder`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}orderby=${orderBy}`;
        const url = `${environment.apiUrl}${entity}?${qryStr}`;

        return this._http.get(url).pipe(
            map(response =>
            {
                const dto = response['value'] as Array<Template>;

                return dto.map(t => new Template(t));
            }),
            catchError(handleError)
        );
    }

    getTemplateBase64(templateId: number): Observable<string>
    {
        let url = `${environment.apiUrl}GetTemplateBase64String(TemplateId=${templateId})`;

        return this._http.get(url).pipe(
            map(response =>
            {
                return response['value'];
            }),
            catchError(handleError)
        );
    }

    getTemplateHeadersXml(templateId: number): Observable<Array<string>>
    {
        let url = `${environment.apiUrl}GetTemplateHeadersXml(TemplateId=${templateId})`;

        return this._http.get(url).pipe(
            map(response =>
            {
                return response['value'];
            }),
            catchError(handleError)
        );
    }

    getTemplateFootersXml(templateId: number): Observable<Array<string>>
    {
        let url = `${environment.apiUrl}GetTemplateFootersXml(TemplateId=${templateId})`;

        return this._http.get(url).pipe(
            map(response =>
            {
                return response['value'];
            }),
            catchError(handleError)
        );
    }

    getTemplateBodyXml(templateId: number): Observable<string>
    {
        let url = `${environment.apiUrl}GetTemplateBodyXml(TemplateId=${templateId})`;

        return this._http.get(url).pipe(
            map(response =>
            {
                return response['value'];
            }),
            catchError(handleError)
        );
    }

    /**
     * Save template slice and increment slice counter
     * @param Office.Slice 
     * @param Template 
     * @param FileState 
     * @returns FileState with counter incremented
     */
    saveTemplateSlice(fileSlice: Office.Slice, template: Template, fileState: FileState): Observable<FileState>
    {
        let url = `${environment.apiUrl}SaveTemplateSlice`;
        let templateSlice = {
            documentName: template.documentName + '.docx',
            templateId: template.templateId,
            sliceNumber: fileState.counter,
            sliceCount: fileState.sliceCount,
            document: btoa(String.fromCharCode.apply(null, new Uint8Array(fileSlice.data)))
        };
        // let doc = new FormData();
        // doc.append("documentName", template.documentName);
        // doc.append("templateId", template.templateId.toString());
        // doc.append("document", fileSlice.data);
        // doc.append("sliceNumber", fileState.counter.toString());
        // doc.append("sliceCount", fileState.sliceCount.toString());

        return this._http.post(url, templateSlice).pipe(
            map(response =>
            {
                fileState.counter++;
                return fileState;
            }),
            catchError(handleError)
        );
    }

    getCustomMergeFields(marketId: number): Observable<Array<MergeField>>
    {
        const filter = `org/edhMarketId eq ${marketId} and org/edhFinancialCommunityId eq null`;
        const expand = `org`;
        const select = `fieldName,isActive`;
        const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;
        const url = `${environment.apiUrl}mergeFields?${qryStr}`;

        return this._http.get(url).pipe(
            map(response =>
            {
                let dtoMergeFields = response['value'] as Array<MergeField>;
                return dtoMergeFields.map(dto => new MergeField(dto));
            }),
            catchError(handleError)
        );
    }

    get CommunityMergeFields$(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Community Address", isActive: true },
            { fieldName: "Community City", isActive: true },
            { fieldName: "Community City State Zip", isActive: true },
            { fieldName: "Community County", isActive: true },
            { fieldName: "Community Full Address", isActive: true },
            { fieldName: "Community Marketing Name", isActive: true },
            { fieldName: "Community Name", isActive: true },
            { fieldName: "Community Number", isActive: true },
            { fieldName: "Community State", isActive: true },
            { fieldName: "Community TCG", isActive: true },
            { fieldName: "Community Zip", isActive: true },
            { fieldName: "Municipality", isActive: true },
            { fieldName: "Tract Number", isActive: true }
        ]);
    }

    get LotMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Alternate Lot/Block", isActive: true },
            { fieldName: "Building Number", isActive: true },
            { fieldName: "Elevation", isActive: true },
            { fieldName: "Garage", isActive: true },
            { fieldName: "Handing", isActive: true },
            { fieldName: "Lot Address", isActive: true },
            { fieldName: "Lot City", isActive: true },
            { fieldName: "Lot City State Zip", isActive: true },
            { fieldName: "Lot Foundation Type", isActive: true },
            { fieldName: "Lot Full Address", isActive: true },
            { fieldName: "Lot Release Date", isActive: true },
            { fieldName: "Lot State", isActive: true },
            { fieldName: "Lot Type", isActive: true },
            { fieldName: "Lot Zip", isActive: true },
            { fieldName: "Lot/Block First Three Numbers", isActive: true },
            { fieldName: "Lot/Block First Two Numbers", isActive: true },
            { fieldName: "Lot/Block Full Number", isActive: true },
            { fieldName: "Lot/Block Last Three Numbers", isActive: true },
            { fieldName: "Lot/Block Last Two Numbers", isActive: true },
            { fieldName: "Phase Name", isActive: true },
            { fieldName: "Plan Description", isActive: true },
            { fieldName: "Plan Foundation Type", isActive: true },
            { fieldName: "Plan ID", isActive: true },
            { fieldName: "Plan Name", isActive: true },
            { fieldName: "Plan TCG", isActive: true },
            { fieldName: "Property Type", isActive: true },
            { fieldName: "Square Feet", isActive: true },
            { fieldName: "Unit Number", isActive: true }
        ]);
    }

    get BuyerMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Co-Buyer 1 Name", isActive: true },
            { fieldName: "Co-Buyer 2 Name", isActive: true },
            { fieldName: "Co-Buyer 3 Name", isActive: true },
            { fieldName: "Co-Buyer 4 Name", isActive: true },
            { fieldName: "Co-Buyer 5 Name", isActive: true },
            { fieldName: "Customer Address", isActive: true },
            { fieldName: "Customer City", isActive: true },
            { fieldName: "Customer City State Zip", isActive: true },
            { fieldName: "Customer County", isActive: true },
            { fieldName: "Customer Full Address", isActive: true },
            { fieldName: "Customer List", isActive: true },
            { fieldName: "Customer Middle Name", isActive: true },
            { fieldName: "Customer Prefix", isActive: true },
            { fieldName: "Customer State", isActive: true },
            { fieldName: "Customer Suffix", isActive: true },
            { fieldName: "Customer Zip", isActive: true },
            { fieldName: "Customers", isActive: true },
            { fieldName: "Email", isActive: true },
            { fieldName: "Fax", isActive: true },
            { fieldName: "Home Phone", isActive: true },
            { fieldName: "Mobile Phone", isActive: true },
            { fieldName: "Primary Buyer Name", isActive: true },
            { fieldName: "Primary Customer First Name", isActive: true },
            { fieldName: "Primary Customer Last Name", isActive: true },
            { fieldName: "Signatures - Customers and Sales Associate", isActive: true },
            { fieldName: "Signatures - Customers without Sales Associate", isActive: true },
            { fieldName: "Work Phone", isActive: true }
        ]);
    }

    get SalesAgreementMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Contingency Expiration Date", isActive: true },
            { fieldName: "Estimated COE", isActive: true },
            { fieldName: "Estimated COE - 2 Month Range", isActive: true },
            { fieldName: "Estimated COE - 2 Month Range - Current Month and Next", isActive: true },
            { fieldName: "Estimated COE - 3 Month Range", isActive: true },
            { fieldName: "Estimated COE - 3 Month Range - Current Month + 2", isActive: true },
            { fieldName: "Estimated COE Month", isActive: true },
            { fieldName: "Estimated Start Date", isActive: true },
            { fieldName: "Estimated Start Date - 2 Month Range", isActive: true },
            { fieldName: "Estimated Start Date - 3 Month Range", isActive: true },
            { fieldName: "JIO or Spec Customer Change Order Number", isActive: true },
            { fieldName: "Lot Transfer Community", isActive: true },
            { fieldName: "Lot Transfer Lot/Block Full Number", isActive: true },
            { fieldName: "Sales Agreement Approve Date", isActive: true },
            { fieldName: "Sales Agreement Cancel Date", isActive: true },
            { fieldName: "Sales Agreement Cancel Detail", isActive: true },
            { fieldName: "Sales Agreement Cancel Reason", isActive: true },
            { fieldName: "Sales Agreement Create Date", isActive: true },
            { fieldName: "Sales Agreement Number", isActive: true },
            { fieldName: "Sales Agreement Signed Date", isActive: true },
            { fieldName: "Sales Agreement Status", isActive: true },
            { fieldName: "Sales Associate", isActive: true },
            { fieldName: "Sales Program Name", isActive: true },
            { fieldName: "Sales Program Name - Buyer Closing Cost", isActive: true },
            { fieldName: "Sales Program Name - Loan Origination", isActive: true }
        ]);
    }

    get DateMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Current Date", isActive: true },
            { fieldName: "Current Date + 3 Days", isActive: true },
            { fieldName: "Current Date + 5 Days", isActive: true },
            { fieldName: "Current Date + 14 Days", isActive: true },
            { fieldName: "Current Date + 21 Days", isActive: true },
            { fieldName: "Current Date + 30 Days", isActive: true },
            { fieldName: "Current Date + 60 Days", isActive: true },
            { fieldName: "Current Day", isActive: true },
            { fieldName: "Current Day of Week", isActive: true },
            { fieldName: "Current Month Name", isActive: true },
            { fieldName: "Current Month Number", isActive: true },
            { fieldName: "Current Year", isActive: true }
        ]);
    }

    get FinancingMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Financed Amount", isActive: true },
            { fieldName: "Home Owners Insurance", isActive: true },
            { fieldName: "Itemized Closing Costs", isActive: true },
            { fieldName: "Itemized Prepaids", isActive: true },
            { fieldName: "Mortgage Insurance", isActive: true },
            { fieldName: "Principle and Interest", isActive: true },
            { fieldName: "Property Taxes", isActive: true },
            { fieldName: "Total Closing Costs", isActive: true },
            { fieldName: "Total Estimated Lender's Monthly Payment", isActive: true },
            { fieldName: "Total Prepaids", isActive: true }
        ]);
    }

    get LenderMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Lender Type", isActive: true },
            { fieldName: "Loan Counselor", isActive: true },
            { fieldName: "Loan Number 1", isActive: true },
            { fieldName: "Loan Number 2", isActive: true },
            { fieldName: "Loan Processor", isActive: true },
            { fieldName: "Loan Status", isActive: true },
            { fieldName: "Loan Term", isActive: true },
            { fieldName: "Loan Type", isActive: true },
            { fieldName: "Pulte Mortgage Product", isActive: true }
        ]);
    }

    get DepositMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Balance Due", isActive: true },
            { fieldName: "Cash at Closing Minus Down Payments", isActive: true },
            { fieldName: "Cash at Closing Minus Earnest Money", isActive: true },
            { fieldName: "Cash at Closing Minus Earnest Money and Down Payments", isActive: true },
            { fieldName: "Current Deposit Paid", isActive: true },
            { fieldName: "Deposit Description", isActive: true },
            { fieldName: "Itemized Deposits", isActive: true },
            { fieldName: "Itemized Down Payment Deposits", isActive: true },
            { fieldName: "Itemized Earnest Money Deposits", isActive: true },
            { fieldName: "Itemized Options Deposits", isActive: true },
            { fieldName: "Itemized Other Deposits", isActive: true },
            { fieldName: "Next Deposit Amount", isActive: true },
            { fieldName: "Next Deposit Due", isActive: true },
            { fieldName: "Next Earnest Money Amount", isActive: true },
            { fieldName: "Next Earnest Money Due", isActive: true },
            { fieldName: "Total Deposits", isActive: true },
            { fieldName: "Total Deposits Due", isActive: true },
            { fieldName: "Total Deposits Paid", isActive: true },
            { fieldName: "Total Down Payment Deposits", isActive: true },
            { fieldName: "Total Down Payment Deposits Due", isActive: true },
            { fieldName: "Total Down Payment Deposits Paid", isActive: true },
            { fieldName: "Total Earnest Money Deposits", isActive: true },
            { fieldName: "Total Earnest Money Deposits Due", isActive: true },
            { fieldName: "Total Earnest Money Deposits Paid", isActive: true },
            { fieldName: "Total Options Deposits", isActive: true },
            { fieldName: "Total Options Deposits Due", isActive: true },
            { fieldName: "Total Options Deposits Paid", isActive: true },
            { fieldName: "Total Other Deposits", isActive: true },
            { fieldName: "Total Other Deposits Due", isActive: true },
            { fieldName: "Total Other Deposits Paid", isActive: true }
        ]);
    }

    get RealtorMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Agent First Name", isActive: true },
            { fieldName: "Agent Last Name", isActive: true },
            { fieldName: "Agent Primary Email", isActive: true },
            { fieldName: "Agent Primary Phone", isActive: true },
            { fieldName: "Agent Secondary Phone", isActive: true },
            { fieldName: "Broker Address", isActive: true },
            { fieldName: "Broker Company", isActive: true }
        ]);
    }

    get PricingMergeFields(): Observable<Array<MergeField>>
    {
        return of([
            { fieldName: "Base House Price", isActive: true },
            { fieldName: "Elevation Price", isActive: true },
            { fieldName: "Lot Premium", isActive: true },
            { fieldName: "Sales Program Amount", isActive: true },
            { fieldName: "Sales Program Amount - Buyer Closing Cost", isActive: true },
            { fieldName: "Sales Program Amount - Loan Origination", isActive: true },
            { fieldName: "Total House Price", isActive: true },
            { fieldName: "Total Option Price", isActive: true },
        ]);
    }
}

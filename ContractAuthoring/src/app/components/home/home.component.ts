import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, filter, tap, switchMap, distinctUntilChanged, map } from 'rxjs/operators'
import { ContractService } from '../../services/contract.service';
import { OrgService } from '../../services/org.service';
import { IdentityService } from '../../services/identity.service';
import { FinancialMarket } from '../../models/financial-market.model';
import { Template } from '../../models/template.model';
import { MergeField } from '../../models/merge-field.model';
import { FileState } from '../../models/file-state';
import { UnsubscribeOnDestroy } from '../../utils/unsubscribe-on-destroy';
import { bind } from '../../utils/decorators';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

declare var OfficeHelpers: any;

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent extends UnsubscribeOnDestroy implements OnInit
{
    isLoading = true;
    templatesLoading = false;
    markets: Array<FinancialMarket>;
    templates: Array<Template>;
    selectedTemplateId: number;
    customMergeFields$: Observable<Array<MergeField>>;

    constructor(public orgService: OrgService, private identityService: IdentityService, private contractService: ContractService, private appInsights: ApplicationInsights)
    {
        super();
    }

    ngOnInit()
    {
        let me = this;

        Word.run(async function (context)
        {
            try
            {
                // load custom document properties to see if the template id is there
                let customDocProps = context.document.properties.customProperties;
                context.load(customDocProps);

                await context.sync();

                const propTemplateId = customDocProps.items.find(i => i.key === "templateId");

                me.selectedTemplateId = propTemplateId ? propTemplateId.value : 0;
                me.orgService.salesMarkets.pipe(
                    finalize(() =>
                    {
                        me.isLoading = false;
                    })
                ).subscribe(markets =>
                {
                    me.markets = markets;
                });

                let templateAndMergeFields: Observable<Template[]>;

                // if template id was found in the document custom properties
                // then get the market associated with the template and select the market
                // then create observable for loading the market's custom merge fields and templates
                if (propTemplateId)
                {
                    me.appInsights.trackTrace({ message: `ContractAuthoring - loading template ${propTemplateId.value}` });
                    templateAndMergeFields = me.contractService.getContractTemplateMarketId(propTemplateId.value).pipe(
                        tap(marketId =>
                        {
                            me.orgService.selectMarket(marketId);
                            me.templatesLoading = true;
                        }),
                        switchMap(marketId =>
                        {
                            return me.orgService.currentMarket$.pipe(
                                me.takeUntilDestroyed(),
                                distinctUntilChanged(),
                                filter(mkt => mkt != null),
                                tap(mkt =>
                                {
                                    me.templatesLoading = true;
                                    me.customMergeFields$ = me.contractService.getCustomMergeFields(mkt.id).pipe(
                                        map(mf => mf.sort((a, b) => a.fieldName.toLocaleLowerCase() < b.fieldName.toLocaleLowerCase() ? -1 : (a.fieldName.toLocaleLowerCase() > b.fieldName.toLocaleLowerCase() ? 1 : 0)))
                                    );
                                }),
                                switchMap(mkt => me.contractService.getContractTemplates(mkt.id))
                            );
                        })
                    );
                }
                // if template id was NOT found in the document custom properties
                // then create observable for loading the market's custom merge fields and templates
                else
                {
                    templateAndMergeFields = me.orgService.currentMarket$.pipe(
                        me.takeUntilDestroyed(),
                        distinctUntilChanged(),
                        filter(mkt => mkt != null),
                        tap(mkt =>
                        {
                            me.templatesLoading = true;
                            me.customMergeFields$ = me.contractService.getCustomMergeFields(mkt.id).pipe(
                                map(mf => mf.sort((a, b) => a.fieldName.toLocaleLowerCase() < b.fieldName.toLocaleLowerCase() ? -1 : (a.fieldName.toLocaleLowerCase() > b.fieldName.toLocaleLowerCase() ? 1 : 0)))
                            );
                        }),
                        switchMap(mkt => me.contractService.getContractTemplates(mkt.id))
                    );
                }

                templateAndMergeFields.subscribe(templates =>
                {
                    me.templates = templates.sort((a, b) => a.documentName.toLocaleLowerCase() < b.documentName.toLocaleLowerCase() ? -1 : (a.documentName.toLocaleLowerCase() > b.documentName.toLocaleLowerCase() ? 1 : 0));
                    me.templatesLoading = false;
                });
            }
            catch (error)
            {
                me.appInsights.trackException({
                    error
                });
            }
        });
    }

    onSelectedMarketChange(value: FinancialMarket)
    {
        this.orgService.selectMarket(value);
    }

    /**
     * Opens the selected template
     * @param template
     */
    @bind
    async loadTemplate(template: Template)
    {
        this.isLoading = true;
        OfficeExtension.config.extendedErrorLogging = true;
        let me = this;
        this.contractService.getTemplateBase64(template.templateId).subscribe(async base64String =>
        {
            return Word.run(async context =>
            {
                // this doesn't work - margins/headers/footers don't get applied
                //let body = context.document.body;
                //let rng = body.insertFileFromBase64(base64String, Word.InsertLocation.replace);
                //return context.sync().then(() => {
                //    this.selectedTemplateId = template.templateId;
                //    this.isLoading = false;
                //});

                // have to create a document from the base64 string and open it in a new instance of Word
                let createdDoc = context.application.createDocument(base64String);
                // set a custom property so when the add-in first loads it looks for the
                // template id and loads the available merge fields for it
                createdDoc.properties.customProperties.add("templateId", template.templateId);
                createdDoc.open();

                try
                {
                    await context.sync();
                    this.isLoading = false;
                } catch (err)
                {
                    this.isLoading = false;
                    OfficeHelpers.UI.notify(err.Message, "Error", "error");
                    OfficeHelpers.Utilities.log(err);
                }
            });
        },
            err =>
            {
                // Document not found in Azure Storage Blob
                // use the current document for the template
                this.isLoading = false;
                OfficeHelpers.UI.notify("Document Not Found in Azure Blob Storage - Using Current Document for Template", "Document Not Found", "warning");
                me.selectedTemplateId = template.templateId;
            });
    }

    goBack()
    {
        this.selectedTemplateId = null;
    }

    @bind
    async saveToCloud()
    {
        const template = this.templates.find(t => t.templateId === this.selectedTemplateId);

        // save template id in document custom property
        await Word.run(async context =>
        {
            let customDocProps = context.document.properties.customProperties;
            context.load(customDocProps);

            await context.sync();

            // if template id already exists as document custom property
            // and it does not equal the selected template id
            // then delete the template id document custom property
            const propTemplateId = customDocProps.items.find(i => i.key === "templateId");
            if (propTemplateId && propTemplateId.value !== template.templateId)
            {
                propTemplateId.delete();
            }

            // save template id to document custom property
            context.document.properties.customProperties.add("templateId", template.templateId);
            return context.sync();
        });

        Office.context.document.getFileAsync(
            Office.FileType.Compressed,
            { sliceSize: 100000, asyncContext: template },
            result =>
            {
                if (result.status == Office.AsyncResultStatus.Succeeded)
                {
                    // Get the File object from the result.
                    let myFile = result.value;
                    let fileState: FileState = {
                        file: myFile,
                        counter: 0,
                        sliceCount: myFile.sliceCount
                    };

                    this.getSliceAndSave(fileState, result.asyncContext);
                }
                else
                {
                    OfficeHelpers.UI.notify(result.status.toString(), "Error", "error");
                    OfficeHelpers.Utilities.log(result.status.toString());
                }
            }
        );
    }

    @bind
    getSliceAndSave(state: FileState, template: Template)
    {
        state.file.getSliceAsync(state.counter, result =>
        {
            if (result.status == Office.AsyncResultStatus.Succeeded)
            {
                this.contractService.saveTemplateSlice(result.value, template, state).subscribe(fileState =>
                {
                    if (fileState.counter === fileState.sliceCount)
                    {
                        this.closeFile(fileState);
                    }
                    else
                    {
                        this.getSliceAndSave(fileState, template);
                    }
                }, (err) =>
                {
                    // slice failed to save
                    this.closeFile(state, err);
                });
            }
        });
    }

    @bind
    closeFile(state: { file: Office.File, counter: number, sliceCount: number }, err: any = null)
    {
        // Close the file when you're done with it.
        state.file.closeAsync(function (result)
        {
            // If the result returns as a success, the
            // file has been successfully closed.
            if (result.status === Office.AsyncResultStatus.Succeeded)
            {
                if (err)
                {
                    const errMsg = err.error ? err.error.Message : err.Message;
                    OfficeHelpers.UI.notify(errMsg, "Error", "error");
                    OfficeHelpers.Utilities.log(err.toString());
                }
                else
                {
                    OfficeHelpers.UI.notify("Template Saved to Azure Blob Storage", "Template Saved", "success");
                }
            }
        });
    }
}

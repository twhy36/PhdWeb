import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { ContractService } from '../../../services/contract.service';
import { MergeField } from '../../../models/merge-field.model';

@Component({
    selector: 'app-merge-field-accordion',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './merge-field-accordion.component.html',
    styleUrls: ['./merge-field-accordion.component.scss']
})
export class MergeFieldAccordionComponent {
    @Input() customMergeFields: Observable<Array<MergeField>>;

    constructor(public contractService: ContractService) { }
    
    async addToDocument(mergeField: MergeField) {
        return Word.run(async context => {
            // in the future consider using specially formatted text instead of merge fields
            // - this would make it a little easier to replace the merge fields with there associated values
            //let insertedMergeField = context.document.getSelection().insertText(`«${mergeField.fieldName}»`, Word.InsertLocation.replace);
            //insertedMergeField.font.highlightColor = "Yellow";

            const mergeFieldOoxml =
                `<pkg:package xmlns:pkg='http://schemas.microsoft.com/office/2006/xmlPackage'>
                  <pkg:part pkg:name='/_rels/.rels' pkg:contentType='application/vnd.openxmlformats-package.relationships+xml' pkg:padding='512'>
                    <pkg:xmlData>
                      <Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='word/document.xml'/></Relationships>
                    </pkg:xmlData>
                  </pkg:part>
                  <pkg:part pkg:name='/word/document.xml' pkg:contentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'>
                    <pkg:xmlData>
                      <w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main' >
                        <w:body>
                          <w:p w:rsidR="00000000" w:rsidRDefault="0043114D">
                            <w:r>
                              <w:fldChar w:fldCharType="begin"/>
                            </w:r>
                            <w:r>
                              <w:instrText xml:space="preserve"> MERGEFIELD  "${mergeField.fieldName}" </w:instrText>
                            </w:r>
                            <w:r>
                              <w:fldChar w:fldCharType="separate"/>
                            </w:r>
                            <w:r>
                              <w:rPr>
                                <w:noProof/>
                              </w:rPr>
                              <w:t>«${mergeField.fieldName}»</w:t>
                            </w:r>
                            <w:r>
                              <w:fldChar w:fldCharType="end"/>
                            </w:r>
                          </w:p>
                        </w:body>
                      </w:document>
                    </pkg:xmlData>
                  </pkg:part>
                </pkg:package>`;

            let selection = context.document.getSelection();

            // load the font so we can apply it to the inserted merge field
            selection.load('font');
            await context.sync();

            // get the font
            let font = selection.font;
            // insert the merge field
            let mergeFieldRange = selection.insertOoxml(mergeFieldOoxml, Word.InsertLocation.replace);
            // set the merge field's font
            mergeFieldRange.font.set(font);

            return context.sync();
        });
    }
}

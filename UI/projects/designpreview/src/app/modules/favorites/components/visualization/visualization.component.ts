import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Choice, TreeVersion, AttributeGroup, DecisionPoint, findChoice, Tree } from "phd-common";
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as _ from 'lodash';

import { map, filter, distinctUntilChanged } from 'rxjs/operators';
import { AVImageService } from "../../../core/services/avimage.service";
import { SelectChoices } from "../../../ngrx-store/scenario/actions";
import { AttributeExt, AttributeGroupExt } from "../../../shared/models/attribute-ext.model";
import { AttributeService } from "../../../core/services/attribute.service";

const kitchenSurfaceMap = {
    'COLOR PACKAGE B- CABINETS': 'cabinets_1',
    'COLOR PACKAGE B- COUNTERTOPS': 'countertops_1',
    'COLOR PACKAGE B- CARPET': 'flooring_1',
    'COLOR PACKAGE A- CABINETS': 'cabinets_1',
    'COLOR PACKAGE A- COUNTERTOPS': 'countertops_1',
    'COLOR PACKAGE A- CARPET': 'flooring_1'
}

const kitchenDPSurfaceMap = {
    'Cabinets': 'cabinets_1',
    'Countertops': 'countertops_1'
}

const kitchenProductMap = {
    'Ellis Purestyle- Stone Gray': 'f51e1056-9acb-4fa2-a8d8-0496263ddc01',
    'Ellis Purestyle- White': '6d7e7635-be37-45f5-8f64-0634b3a09879',
    'Slider II- Silver Mist 540': '582e10ce-7d14-4e5e-b71d-00488a8a5c41',
    'Majestic Frost': '261e53d2-6c4c-432b-9e0e-017cdfeb7c5f',
    'Frost White': '5580b3e0-17bf-44e5-b631-1928bbce0c3d',
    'Sinclair Birch Autumn': '68e7117b-c293-4712-af86-049270f6c1ce',
    'Sinclair Birch Café': 'f51e1056-9acb-4fa2-a8d8-0496263ddc01',
    'Avalon Maple Autumn': '6d7e7635-be37-45f5-8f64-0634b3a09879',
    'Barcelona - Granite': '261e53d2-6c4c-432b-9e0e-017cdfeb7c5f',
    'Dallas White - Granite': '5580b3e0-17bf-44e5-b631-1928bbce0c3d',
    'New Caledonia - Granite': '906b1457-6ff5-41f4-b1b8-1da2b0b6be3e'
}

const exteriorSceneMap = {
    'Elevation TD 103': 'c9a41dcd-8504-4ad7-a9c0-0d1baca9b7d9',
    'Elevation TD 104': '39f29ef2-875c-4aeb-ab22-b2d7c4774b48',
    'Elevation TD 105': '3e5ebee3-60db-41c0-aed2-2e0cfb15f7a4',
    'Elevation TD 109': 'b9c2c5e6-e9b6-489c-ac9e-96e61d35b2ba'
}

const exteriorSurfaceMap = {
    'Aluminum Fascia Color:': { 
        surfaceID: 'fascia_1',
        products: {
            'White': '0c910055-d8c6-4154-a0eb-6eea5d3aebcb'
        }
    },
    'Vinyl Soffit Color:': {
        surfaceID: 'soffit_1',
        products: {
            'White': '9c0aa296-28a6-4503-9bf5-af53dce88987'
        }
    },
    'Front Door / Shutter Color:': {
        surfaceID: 'door_front',
        products: {
            'Colleton Woods': 'cb553564-810c-4186-a792-528217ff7c5e'
        }
    },
    'Window Color:': {
        surfaceID: 'window_frame_1_front',
        products: {
            'White': 'f592fcf5-711a-4597-8142-824a0e14c214'
        }
    },
    'Roof Shingle Color:': {
        surfaceID: 'roof_1',
        products: {
            'Weathered Wood': 'c6091783-a265-4177-9e04-ac64e2aaa669'
        }
    }
}

@Component({
    templateUrl: 'visualization.component.html',
    styleUrls: ['visualization.component.scss'],
    selector: 'visualization'
})
export class VisualizationComponent implements OnInit
{
    scene: 'Exterior' | 'Kitchen';
    tree: Tree;
    imageUrl: string;
    choiceAttributes: { choiceId: number, attributeGroups: AttributeGroupExt[] }[] = [];
    selectedAttributes: {attributeGroupId: number, attributeId: number, dpointId?: number, choiceId?: number}[] = [];
    kitchenDPs: DecisionPoint[];

    constructor(private route: ActivatedRoute,
        private store: Store<fromRoot.State>,
        private avImageService: AVImageService,
        private attributeService: AttributeService) {}

    ngOnInit() {
        this.route.data.pipe(
            map(params => params['type']),
            filter(scene => !!scene),
            distinctUntilChanged()
        ).subscribe(scene => this.scene = scene);

        this.store.pipe(
            select(state => state.scenario.tree)
        ).subscribe(tree => {
            this.tree = tree;
            if (tree.id === 597){
                this.kitchenDPs = [
                    this.tree.treeVersion.groups[1].subGroups[1].points[3],
                    this.tree.treeVersion.groups[1].subGroups[1].points[8]
                ];
                this.generateImage();
            }
        });
    }

    selectChoice(choice: Choice) {
        //Elevation
        if (choice.treePointId === this.tree.treeVersion.groups[0].subGroups[0].points[0].id)
        {
            this.store.dispatch(new SelectChoices(false, { choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: 1 }));
            this.generateImage();
        }

        //Color Scheme/Package
        if (choice.treePointId === this.tree.treeVersion.groups[0].subGroups[0].points[1].id)
        {
            this.store.dispatch(new SelectChoices(false, { choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: 1 }));

            this.attributeService.getAttributeGroups(choice)
                .pipe(
                    map(result => this.populateAttributeGroups(result, choice))
                ).subscribe(result => {
                    this.choiceAttributes = [{ choiceId: choice.id, attributeGroups: result }];
                    this.selectedAttributes = _.flatMap(this.choiceAttributes, att => att.attributeGroups)
                        .map(ca => ({attributeGroupId: ca.id, attributeId: ca.attributes[0].id}));
                    this.generateImage();
                });
        }

        if (choice.treePointId === this.tree.treeVersion.groups[1].subGroups[1].points[0].id)
        {
            this.store.dispatch(new SelectChoices(false, { choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: 1 }));

            this.attributeService.getAttributeGroups(choice)
                .pipe(
                    map(result => this.populateAttributeGroups(result, choice))
                ).subscribe(result => {
                    this.choiceAttributes = [{ choiceId: choice.id, attributeGroups: result }];
                    this.selectedAttributes = _.flatMap(this.choiceAttributes, ca => ca.attributeGroups)
                        .map(ca => ({attributeGroupId: ca.id, attributeId: ca.attributes[0].id}));
                    this.generateImage();
                });
        }

        if (this.kitchenDPs.some(dp => dp.id === choice.treePointId))
        {
            this.store.dispatch(new SelectChoices(false, { choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: 1 }));

            this.attributeService.getAttributeGroups(choice)
                .pipe(
                    map(result => this.populateAttributeGroups(result, choice))
                ).subscribe(result => {
                    this.choiceAttributes = this.choiceAttributes || [];
                    
                    let attributes = this.choiceAttributes.find(ca => ca.choiceId === choice.id);
                    if (!attributes){
                        this.choiceAttributes.push(({ choiceId: choice.id, attributeGroups: result }));
                    }

                    this.selectedAttributes = this.selectedAttributes.filter(att => att.choiceId !== choice.id);
                    this.selectedAttributes.push(..._.flatMap(this.choiceAttributes, ca => ca.attributeGroups)
                        .map(ca => ({attributeGroupId: ca.id, attributeId: ca.attributes[0].id, dpointId: choice.treePointId, choiceId: choice.id })));
                    this.generateImage();
                });
        }
    }

    populateAttributeGroups(attributeGroups: AttributeGroup[], choice: Choice): AttributeGroupExt[]
	{
		let attributeGroupExts: AttributeGroupExt[] = [];

		if (attributeGroups)
		{
			const attGroups = _.orderBy(attributeGroups, 'sortOrder');

			attGroups.forEach(attributeGroup =>
			{
				attributeGroup.choiceId = choice.id;

				let attributes: AttributeExt[] = [];

				if (attributeGroup.attributes)
				{
					attributeGroup.attributes.forEach(att =>
					{
						attributes.push(new AttributeExt(att, null, false));
					});
				}

				if (attributes.length)
				{
					attributeGroupExts.push(new AttributeGroupExt(attributeGroup, attributes));
				}
			});
		}

        return attributeGroupExts;
	}

    generateImage() {
        if (this.scene === 'Kitchen' && this.tree.treeVersion.groups[1].subGroups[1].points[0].label === 'Additional Fixtures')
        {
            if (this.selectedAttributes.length)
            {
                this.avImageService.renderImage(
                    "e66fd36d-9299-4698-a474-8727d9eeb45d",
                    "c806f987-5d93-4cfa-b30f-92f9a95fa5d7",
                    this.selectedAttributes.map(att => {
                        let ag = this.choiceAttributes[0].attributeGroups.find(ca => ca.id === att.attributeGroupId);
                        let surface = kitchenSurfaceMap[ag.name.toUpperCase()];
                        let productGuid = kitchenProductMap[ag.attributes.find(a => a.id === att.attributeId)?.name];
                        return { surface, productGuid };
                    }).filter(ag => ag.productGuid && ag.surface))
                    .subscribe(image => {
                        console.log(image);
                        this.imageUrl = image;
                    });
            }
        }
        else if (this.scene === 'Kitchen')
        {
            this.avImageService.renderImage(
                "e66fd36d-9299-4698-a474-8727d9eeb45d",
                "c806f987-5d93-4cfa-b30f-92f9a95fa5d7",
                this.selectedAttributes.filter(sa => findChoice(this.tree, ch => ch.id === sa.choiceId)?.quantity > 0).map(att => {
                    let ag = this.choiceAttributes.find(ca => ca.choiceId === att.choiceId)
                        .attributeGroups.find(ca => ca.id === att.attributeGroupId);
                    if (!ag) return { surface: null, productGuid: null };
                    let dp = this.kitchenDPs.find(dp => dp.id === att.dpointId);
                    let surface = kitchenDPSurfaceMap[dp.label];
                    console.log(surface);
                    let productGuid = kitchenProductMap[ag.attributes.find(a => a.id === att.attributeId)?.name];
                    return { surface, productGuid };
                }).filter(ag => ag.productGuid && ag.surface))
                .subscribe(image => {
                    console.log(image);
                    this.imageUrl = image;
                });
        }

        if (this.scene === 'Exterior')
        {
            let sceneID = exteriorSceneMap[this.tree.treeVersion.groups[0].subGroups[0].points[0].choices.find(c => c.quantity)?.label];
            if (sceneID)
            {
                this.avImageService.renderImage(
                    sceneID,
                    "500496bb-a2d1-42a6-a9b3-2b02362ab793",
                    (this.selectedAttributes || []).map(att => {
                        let ag = this.choiceAttributes[0].attributeGroups.find(ca => ca.id === att.attributeGroupId);
                        let surface = exteriorSurfaceMap[ag.label];
                        if (!surface){
                            return { surface: null, productGuid: null};
                        }
                        let productGuid = surface.products[ag.attributes.find(a => a.id === att.attributeId)?.name];
                        return { surface: surface.surfaceID, productGuid };
                    }).filter(ag => ag.productGuid && ag.surface))
                    .subscribe(image => {
                        console.log(image);
                        this.imageUrl = image;
                    });
            }
        }
    }

    attributeClick(data: {attribute: AttributeExt, attributeGroup: AttributeGroupExt}, choice?: Choice) {
        if (!choice){
            let selectedAttribute = this.selectedAttributes.find(sa => sa.attributeGroupId === data.attributeGroup.id);

            if (selectedAttribute){
                selectedAttribute.attributeId = data.attribute.id;
            }else{
                this.selectedAttributes.push({ attributeGroupId: data.attributeGroup.id, attributeId: data.attribute.id});
            }
        }else{
            let selectedAttribute = this.selectedAttributes.find(sa => sa.attributeGroupId === data.attributeGroup.id && sa.choiceId === choice.id);

            if (selectedAttribute){
                selectedAttribute.attributeId = data.attribute.id;
            }else{
                this.selectedAttributes.push({ attributeGroupId: data.attributeGroup.id, attributeId: data.attribute.id, choiceId: choice.id, dpointId: choice.treePointId});
            }
        }

        this.generateImage();
    }

    getChoiceAttributes(choice: Choice): AttributeGroupExt[]
    {
        return this.choiceAttributes.find(ca => ca.choiceId === choice.id)?.attributeGroups;
    }
}
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PointStatus } from 'phd-common';
import { instance, mock } from 'ts-mockito';

import { ChoiceCardComponent } from './choice-card.component';

describe('ChoiceCardComponent', () => {
  let component: ChoiceCardComponent;
  let fixture: ComponentFixture<ChoiceCardComponent>;
	const mockNgbModal = mock(NgbModal);
	// when(mockActivatedRoute.paramMap).thenCall(() => new Observable());

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChoiceCardComponent ],
			imports: [ BrowserAnimationsModule ],
			providers: [
				{ provide: NgbModal, useFactory: () => instance(mockNgbModal) },
			]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChoiceCardComponent);
    component = fixture.componentInstance;
		component.choice = {
			mappedAttributeGroups: [],
			mappedLocationGroups: [],
			attributeGroups: [],
			locationGroups: [],
			choiceMaxQuantity: null,
			description: '',
			disabledBy: [],
			divChoiceCatalogId: 0,
			enabled: true,
			hasChoiceRules: false,
			hasOptionRules: false,
			id: 4,
			imagePath: '',
			hasImage: false,
			isDecisionDefault: false,
			isSelectable: true,
			label: 'test Choice 4',
			maxQuantity: 1,
			options: [],
			overrideNote: '',
			price: 100,
			quantity: 0,
			selectedAttributes: [],
			sortOrder: 0,
			treePointId: 3,
			treeVersionId: 1,
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			choiceStatus: 'Available',
			isPointStructural: false,
			myFavoritesChoice: null,
			isFavorite: false,
			favoriteAttributes: []
		};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

	describe('openBlockedChoiceModal', () => {
		beforeEach(() => {
			component.groups = [{
				id: 1,
				groupCatalogId: 1,
				treeVersionId: 1,
				sortOrder: 0,
				label: 'test group 1',
				subGroups: [{
					id: 4,
					groupId: 1,
					subGroupCatalogId: 3,
					sortOrder: 0,
					label: 'testing sub group',
					useInteractiveFloorplan: false,
					treeVersionId: 1,
					points: [{
						id: 10,
						hasPointToPointRules: false,
						hasPointToChoiceRules: false,
						subGroupId: 1,
						divPointCatalogId: 11,
						pointPickTypeId: 1,
						pointPickTypeLabel: '',
						sortOrder: 0,
						isQuickQuoteItem: false,
						isStructuralItem: false,
						label: 'test point 10',
						description: '',
						treeVersionId: 1,
						choices: [component.choice],
						completed: false,
						viewed: false,
						enabled: true,
						disabledBy: [],
						status: PointStatus.REQUIRED,
						price: 0,
						dPointTypeId: 10,
						subGroupCatalogId: 3,
						isPastCutOff: false
					}],
					status: PointStatus.REQUIRED
				}],
				status: PointStatus.REQUIRED
			},{
				id: 2,
				groupCatalogId: 1,
				treeVersionId: 1,
				sortOrder: 0,
				label: 'test group 1',
				subGroups: [{
					id: 5,
					groupId: 2,
					subGroupCatalogId: 3,
					sortOrder: 0,
					label: 'testing sub group',
					useInteractiveFloorplan: false,
					treeVersionId: 1,
					points: [{
						id: 11,
						hasPointToPointRules: false,
						hasPointToChoiceRules: false,
						subGroupId: 1,
						divPointCatalogId: 11,
						pointPickTypeId: 1,
						pointPickTypeLabel: '',
						sortOrder: 0,
						isQuickQuoteItem: false,
						isStructuralItem: false,
						label: 'test point 11',
						description: '',
						treeVersionId: 1,
						choices: [{
							mappedAttributeGroups: [],
							mappedLocationGroups: [],
							attributeGroups: [],
							locationGroups: [],
							choiceMaxQuantity: null,
							description: '',
							disabledBy: [],
							divChoiceCatalogId: 0,
							enabled: true,
							hasChoiceRules: false,
							hasOptionRules: false,
							id: 6,
							imagePath: '',
							hasImage: false,
							isDecisionDefault: false,
							isSelectable: true,
							label: 'test Choice 6',
							maxQuantity: 1,
							options: [],
							overrideNote: '',
							price: 100,
							quantity: 0,
							selectedAttributes: [],
							sortOrder: 0,
							treePointId: 3,
							treeVersionId: 1,
							lockedInOptions: [],
							changedDependentChoiceIds: [],
							lockedInChoice: null,
							mappingChanged: false
						}],
						completed: false,
						viewed: false,
						enabled: true,
						disabledBy: [],
						status: PointStatus.REQUIRED,
						price: 0,
						dPointTypeId: 10,
						subGroupCatalogId: 3,
						isPastCutOff: false
					}],
					status: PointStatus.REQUIRED
				}],
				status: PointStatus.REQUIRED
			}];
			component.currentPoint = component.groups[0].subGroups[0].points[0];
		});
		it('should open the modal', () => {
			const modalServiceSpy = spyOn(component.modalService, 'open');

			component.openBlockedChoiceModal();
			expect(modalServiceSpy).toHaveBeenCalled();
		});
		it('should set up disabledByList for Choice-to-Choice rules', () => {
			component.choice.disabledBy = [{
				choiceId: 4,
				executed: true,
				rules: [{ choices: [6], ruleId: 13, ruleType: 1 }]
			}];

			component.openBlockedChoiceModal();
			expect(component.disabledByList).not.toBeUndefined();
			expect(component.disabledByList.length).toEqual(1);
			expect(component.disabledByList[0].label).toEqual('test Choice 6');
			expect(component.disabledByList[0].choiceId).toEqual(6);
			expect(component.disabledByList[0].pointId).toEqual(11);
		});
		it('should set up disabledByList for DP-to-Choice rules', () => {
			component.currentPoint.disabledBy = [{
				pointId: 10,
				executed: true,
				rules: [{ points: [], choices: [6], ruleId: 14, ruleType: 1 }]
			}];

			component.openBlockedChoiceModal();
			expect(component.disabledByList).not.toBeUndefined();
			expect(component.disabledByList.length).toEqual(1);
			expect(component.disabledByList[0].label).toEqual('test Choice 6');
			expect(component.disabledByList[0].choiceId).toEqual(6);
			expect(component.disabledByList[0].pointId).toEqual(11);
		});
		it('should set up disabledByList for DP-to-DP rules', () => {
			component.currentPoint.disabledBy = [{
				pointId: 10,
				executed: true,
				rules: [{ points: [11], choices: [], ruleId: 15, ruleType: 1 }]
			}];

			component.openBlockedChoiceModal();
			expect(component.disabledByList).not.toBeUndefined();
			expect(component.disabledByList.length).toEqual(1);
			expect(component.disabledByList[0].label).toEqual('test point 11');
			expect(component.disabledByList[0].choiceId).toBeUndefined();
			expect(component.disabledByList[0].pointId).toEqual(11);
		});
	});
});

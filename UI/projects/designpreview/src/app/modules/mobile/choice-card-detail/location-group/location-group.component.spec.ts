import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationGroupComponent } from './location-group.component';
import { ToastrService } from 'ngx-toastr';
import { AdobeService } from '../../../core/services/adobe.service';
import { AttributeService } from '../../../core/services/attribute.service';
import { instance, mock } from 'ts-mockito';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MockCloudinaryImage } from '../../../shared/mock-components/mock-cloudinary-image';

describe('LocationGroupComponent', () => 
{
	let component: LocationGroupComponent;
	let fixture: ComponentFixture<LocationGroupComponent>;
	let mockStore: MockStore;
	const initialState = {
		scenario: fromScenario.initialState
	};

	const mockToastrService = mock(ToastrService);
	const mockAdobeService = mock(AdobeService);
	const mockAttributeService = mock(AttributeService);

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ LocationGroupComponent , MockCloudinaryImage],
			imports: [
				BrowserAnimationsModule,
				MatExpansionModule,
				NgbModule
			],
			providers: [
				provideMockStore({ initialState }),
				{ provide: ToastrService, useFactory: () => instance(mockToastrService) },
				{ provide: AdobeService, useFactory: () => instance(mockAdobeService) },
				{ provide: AttributeService, useFactory: () => instance(mockAttributeService) },
			]
		})
			.compileComponents();

		fixture = TestBed.createComponent(LocationGroupComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});
});

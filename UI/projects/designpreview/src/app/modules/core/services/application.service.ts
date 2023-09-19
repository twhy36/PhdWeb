import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../ngrx-store/reducers';
import { ChoiceExt } from '../../shared/models/choice-ext.model';
import * as ScenarioActions from '../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../ngrx-store/favorite/actions';
import { MyFavoritesPointDeclined } from 'phd-common';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  isMobile: boolean;
  constructor(private store: Store<fromRoot.State>) {
    this.isMobile = window.matchMedia("(max-width: 1224px)").matches;
   }

   favoriteClicked(choice: ChoiceExt, isDesignComplete: boolean, declinedPoints: MyFavoritesPointDeclined[]) {
    this.store.dispatch(
			new ScenarioActions.SelectChoices(isDesignComplete,
				{
					choiceId: choice.id,
					divChoiceCatalogId: choice.divChoiceCatalogId,
					quantity: choice.quantity,
					attributes: choice.selectedAttributes
				}));
		this.store.dispatch(new ScenarioActions.SetStatusForPointsDeclined(declinedPoints.map(dp => dp.divPointCatalogId), false));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());

    if (this.isMobile) {
      // code any mobile specific logic here
    }
  }

}

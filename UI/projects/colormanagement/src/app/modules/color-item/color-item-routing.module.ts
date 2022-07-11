import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ColorItemsPageComponent } from './components/color-items-page';

const routes: Routes = [
  { path: 'coloritem', pathMatch: 'full', component: ColorItemsPageComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class ColorItemRoutingModule { }

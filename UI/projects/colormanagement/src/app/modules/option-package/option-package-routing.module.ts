import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OptionPackagesPageComponent } from './components/option-packages-page/option-packages-page.component';

const routes: Routes = [
  { path: 'optionpackage', pathMatch: 'full', component: OptionPackagesPageComponent }
  // { path: ':id', component: OptionPackagesEditComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OptionPackageRoutingModule { }

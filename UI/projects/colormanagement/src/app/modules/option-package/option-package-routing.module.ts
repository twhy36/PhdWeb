import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditOptionPackagesComponent } from './components/edit-option-packages/edit-option-packages.component';
import { OptionPackagesPageComponent } from './components/option-packages-page/option-packages-page.component';

const routes: Routes = [
  { path: 'optionpackage', pathMatch: 'full', component: OptionPackagesPageComponent },
  { path: 'optionpackage/:bundleid', component: EditOptionPackagesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OptionPackageRoutingModule { }

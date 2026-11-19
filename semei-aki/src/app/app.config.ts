import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, type Routes } from '@angular/router';
import { Cadastro } from './pages/cadastro/cadastro';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Produtor } from './pages/produtor/produtor';

const routes: Routes = [
  { path: '', component: Home, title: 'SemeiAki | Produtos locais' },
  { path: 'login', component: Login, title: 'Entrar | SemeiAki' },
  { path: 'cadastro', component: Cadastro, title: 'Cadastro | SemeiAki' },
  { path: 'produtor', component: Produtor, title: 'Área do produtor | SemeiAki' },
  { path: '**', redirectTo: '' },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes)
  ]
};

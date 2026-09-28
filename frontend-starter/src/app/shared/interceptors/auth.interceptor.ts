import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Intercepteur HTTP :
 * 1. Attache le jeton JWT (Bearer) à l'en-tête Authorization des requêtes sortantes.
 * 2. Intercepte les erreurs 401 (token expiré ou invalide) sur les requêtes protégées
 *    pour déconnecter automatiquement l'utilisateur et le rediriger vers /login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  // Clone la requête pour ajouter l'en-tête Authorization si un token est disponible
  const authRequest = token
    ? request.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : request;

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      // Si le backend renvoie 401 sur une route protégée, la session est expirée/invalide.
      // On exclut la tentative de login où le 401 signifie simplement "mauvais mot de passe".
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.includes('/api/auth/login')
      ) {
        console.warn('[authInterceptor] Jeton expiré ou non autorisé (401), retour au login');
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};


import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';

/**
 * Service gérant l'authentification et l'état réactif de l'utilisateur connecté.
 * Fournit des Signals pour le jeton JWT et l'utilisateur courant, ainsi qu'un
 * Signal calculé (computed) pour connaître l'état de connexion.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // Clés de stockage local (localStorage)
  private static readonly TOKEN_KEY = 'gpc_token';
  private static readonly USER_KEY = 'gpc_user';

  // État réactif géré par des Signals
  readonly token = signal<string | null>(localStorage.getItem(AuthService.TOKEN_KEY));
  readonly currentUser = signal<User | null>(this.loadStoredUser());

  // Signal dérivé : l'utilisateur est connecté si un token est présent
  readonly isLoggedIn = computed(() => !!this.token());

  /** Connexion d'un utilisateur existant. */
  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap((response) => this.storeAuthentication(response)));
  }

  /** Inscription d'un nouvel utilisateur. */
  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>('/api/auth/register', { name, email, password })
      .pipe(tap((response) => this.storeAuthentication(response)));
  }

  /** Récupère le profil frais depuis /api/users/me et synchronise l'état réactif. */
  profile() {
    return this.http
      .get<User>('/api/users/me')
      .pipe(tap((user) => this.saveUser(user)));
  }

  /** Met à jour le nom de l'utilisateur via PUT /api/users/me. */
  update(name: string) {
    return this.http
      .put<User>('/api/users/me', { name })
      .pipe(tap((user) => this.saveUser(user)));
  }

  /** Déconnexion : vide le localStorage et réinitialise les Signals. */
  logout(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  /** Mémorise le token et l'utilisateur reçus après connexion ou inscription. */
  private storeAuthentication(response: AuthResponse): void {
    localStorage.setItem(AuthService.TOKEN_KEY, response.token);
    this.token.set(response.token);
    this.saveUser(response.user);
  }

  /** Met à jour le Signal currentUser et le localStorage. */
  private saveUser(user: User): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  /** Récupère l'utilisateur mis en cache dans le localStorage au démarrage. */
  private loadStoredUser(): User | null {
    const raw = localStorage.getItem(AuthService.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}


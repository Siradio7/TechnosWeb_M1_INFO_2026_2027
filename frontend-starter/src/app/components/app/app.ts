import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

/**
 * Composant racine de l'application Guitar Practice Cloud.
 * Affiche l'en-tête de navigation réactif et le conteneur des routes enfants.
 */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Déconnecte l'utilisateur, nettoie l'état local et redirige vers /login. */
  logout(): void {
    console.debug('[AppComponent] Déconnexion effectuée');
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

